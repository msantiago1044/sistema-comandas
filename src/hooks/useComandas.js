// src/hooks/useComandas.js
// Hook principal: carga inicial + suscripción Realtime + gestión de estado local
// Optimizado para evitar re-renders innecesarios y minimizar peticiones a BD

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  supabase,
  cargarComandas,
  actualizarEstado,
  editarComanda,
  ESTADOS,
} from '../lib/supabase'
import {
  tocarCampanaCocina,
  flashPantallaAlertaCocina,
  tocarPitidoMesero,
  vibrarMesero,
  notificarMeseroListo,
} from '../lib/notificaciones'

/**
 * @param {string|null} salaId   - UUID de la sala activa
 * @param {string|null} meseroId - UUID del mesero (null si es cocina)
 */
export function useComandas(salaId, meseroId) {
  const [comandas, setComandas]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)

  // Ref para evitar alertas duplicadas en el mismo render cycle
  const alertadosRef = useRef(new Set())
  const canalRef     = useRef(null)

  // ─── Carga inicial ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!salaId) return

    let cancelado = false

    async function init() {
      setCargando(true)
      const { comandas: data, error: err } = await cargarComandas(salaId)
      if (!cancelado) {
        if (err) setError(err.message)
        else setComandas(data)
        setCargando(false)
      }
    }

    init()
    return () => { cancelado = true }
  }, [salaId])

  // ─── Suscripción Realtime ──────────────────────────────────────────────
  useEffect(() => {
    if (!salaId) return

    // Limpiar canal anterior si existe
    if (canalRef.current) {
      supabase.removeChannel(canalRef.current)
    }

    const canal = supabase
      .channel(`sala:${salaId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'comandas',
          filter: `sala_id=eq.${salaId}`,
        },
        async (payload) => {
          const { eventType, new: nueva, old: vieja } = payload

          if (eventType === 'INSERT') {
            // Buscar datos del mesero para el JOIN (Realtime no incluye FK joins)
            const { data: meseroData } = await supabase
              .from('meseros')
              .select('id, nombre')
              .eq('id', nueva.mesero_id)
              .single()

            const comandaCompleta = { ...nueva, mesero: meseroData }

            setComandas(prev => {
              // Evitar duplicados
              if (prev.some(c => c.id === nueva.id)) return prev
              return [...prev, comandaCompleta]
            })

            // Alerta de cocina: nueva comanda
            if (!meseroId) {
              tocarCampanaCocina()
              flashPantallaAlertaCocina()
            }
          }

          if (eventType === 'UPDATE') {
            setComandas(prev =>
              prev
                .map(c => c.id === nueva.id ? { ...c, ...nueva } : c)
                // Filtrar pagadas de la vista activa
                .filter(c => c.estado !== ESTADOS.PAGADO)
            )

            // Alerta al mesero: su comanda está lista
            if (
              meseroId &&
              nueva.estado === ESTADOS.LISTO &&
              nueva.mesero_id === meseroId &&
              !alertadosRef.current.has(nueva.id)
            ) {
              alertadosRef.current.add(nueva.id)
              tocarPitidoMesero()
              vibrarMesero()
              notificarMeseroListo(nueva.serial, nueva.mesa)

              // Limpiar el Set tras 10s para evitar memory leaks
              setTimeout(() => alertadosRef.current.delete(nueva.id), 10_000)
            }
          }

          if (eventType === 'DELETE') {
            setComandas(prev => prev.filter(c => c.id !== vieja.id))
          }
        }
      )
      .subscribe()

    canalRef.current = canal

    return () => {
      supabase.removeChannel(canal)
      canalRef.current = null
    }
  }, [salaId, meseroId])

  // ─── Acciones (memoizadas para estabilidad de props) ──────────────────

  const marcarListo = useCallback(async (comandaId) => {
    // Optimistic update
    setComandas(prev =>
      prev.map(c => c.id === comandaId
        ? { ...c, estado: ESTADOS.LISTO, listo_at: new Date().toISOString() }
        : c
      )
    )
    const { error: err } = await actualizarEstado(comandaId, ESTADOS.LISTO)
    if (err) {
      // Revertir en error
      setComandas(prev =>
        prev.map(c => c.id === comandaId ? { ...c, estado: ESTADOS.PENDIENTE } : c)
      )
      setError(err.message)
    }
  }, [])

  const marcarPorCobrar = useCallback(async (comandaId) => {
    setComandas(prev =>
      prev.map(c => c.id === comandaId ? { ...c, estado: ESTADOS.POR_COBRAR } : c)
    )
    const { error: err } = await actualizarEstado(comandaId, ESTADOS.POR_COBRAR)
    if (err) setError(err.message)
  }, [])

  const marcarPagado = useCallback(async (comandaId) => {
    // Remover inmediatamente de la vista (se va al historial)
    setComandas(prev => prev.filter(c => c.id !== comandaId))
    const { error: err } = await actualizarEstado(comandaId, ESTADOS.PAGADO)
    if (err) setError(err.message)
  }, [])

  const editarDetalle = useCallback(async (comandaId, nuevoDetalle) => {
    setComandas(prev =>
      prev.map(c => c.id === comandaId ? { ...c, detalle: nuevoDetalle } : c)
    )
    const { error: err } = await editarComanda(comandaId, nuevoDetalle)
    if (err) setError(err.message)
  }, [])

  // ─── Vistas filtradas (sin recalcular en cada render) ─────────────────
  const pendientes  = comandas.filter(c => c.estado === ESTADOS.PENDIENTE)
  const listos      = comandas.filter(c => c.estado === ESTADOS.LISTO)
  const porCobrar   = comandas.filter(c => c.estado === ESTADOS.POR_COBRAR)

  // Para el mesero: sus comandas activas (todas excepto pagadas)
  const misComandas = meseroId
    ? comandas.filter(c => c.mesero_id === meseroId)
    : []

  return {
    comandas,
    pendientes,
    listos,
    porCobrar,
    misComandas,
    cargando,
    error,
    marcarListo,
    marcarPorCobrar,
    marcarPagado,
    editarDetalle,
  }
}
