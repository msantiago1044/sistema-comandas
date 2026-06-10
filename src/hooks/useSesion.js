// src/hooks/useSesion.js
// Gestión de sesión: creación de sala, conexión de mesero, persistencia local

import { useState, useEffect, useCallback } from 'react'
import {
  crearSala,
  buscarSalaPorPin,
  registrarMesero,
  cerrarSala,
} from '../lib/supabase'
import { solicitarPermisoNotificaciones } from '../lib/notificaciones'

const STORAGE_KEY = 'comandas_sesion'

function cargarSesionLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function guardarSesionLocal(sesion) {
  try {
    if (sesion) localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion))
    else localStorage.removeItem(STORAGE_KEY)
  } catch { /* Safari private mode */ }
}

export function useSesion() {
  const [sesion, setSesion]           = useState(null)       // { sala, mesero|null, rol }
  const [cargando, setCargando]       = useState(false)
  const [error, setError]             = useState(null)
  const [inicializado, setInicializado] = useState(false)

  // Restaurar sesión del almacenamiento local al montar
  useEffect(() => {
    const local = cargarSesionLocal()
    if (local) setSesion(local)
    setInicializado(true)
  }, [])

  // Persistir sesión cuando cambia
  useEffect(() => {
    if (inicializado) guardarSesionLocal(sesion)
  }, [sesion, inicializado])

  /** Cocina: crear nueva sala */
  const iniciarSalaCocina = useCallback(async (nombre, numMesas) => {
    setError(null)
    setCargando(true)
    const { sala, error: err } = await crearSala(nombre, numMesas)
    setCargando(false)

    if (err || !sala) {
      setError(err?.message ?? 'No se pudo crear la sala')
      return false
    }

    setSesion({ sala, mesero: null, rol: 'cocina' })
    return true
  }, [])

  /** Mesero: conectarse a sala con PIN */
  const conectarMesero = useCallback(async (pin, nombre) => {
    setError(null)
    setCargando(true)

    const { sala, error: errSala } = await buscarSalaPorPin(pin.trim())
    if (errSala || !sala) {
      setError('PIN incorrecto o sala cerrada')
      setCargando(false)
      return false
    }

    const { mesero, error: errMesero } = await registrarMesero(sala.id, nombre.trim())
    setCargando(false)

    if (errMesero || !mesero) {
      setError(errMesero?.message ?? 'No se pudo registrar')
      return false
    }

    // Solicitar permiso de notificaciones (no bloquear si se rechaza)
    await solicitarPermisoNotificaciones()

    setSesion({ sala, mesero, rol: 'mesero' })
    return true
  }, [])

  /** Cerrar sala (solo cocina) */
  const finalizarSala = useCallback(async () => {
    if (!sesion?.sala?.id) return
    await cerrarSala(sesion.sala.id)
    setSesion(null)
  }, [sesion])

  /** Desconectar mesero de la sesión */
  const desconectarMesero = useCallback(() => {
    setSesion(null)
  }, [])

  return {
    sesion,
    cargando,
    error,
    inicializado,
    esCocina:  sesion?.rol === 'cocina',
    esMesero:  sesion?.rol === 'mesero',
    sala:      sesion?.sala  ?? null,
    mesero:    sesion?.mesero ?? null,
    iniciarSalaCocina,
    conectarMesero,
    finalizarSala,
    desconectarMesero,
  }
}
