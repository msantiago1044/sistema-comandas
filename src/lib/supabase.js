// src/lib/supabase.js
// Cliente de Supabase + tipos de datos del sistema

import { createClient } from '@supabase/supabase-js'

// ─── Configuración ────────────────────────────────────────────────────────────
// Reemplaza con tus valores de Supabase Dashboard → Project Settings → API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: { eventsPerSecond: 20 },
  },
})

// ─── Constantes de estado (máquina de estados) ───────────────────────────────
export const ESTADOS = {
  PENDIENTE:   'pendiente',
  LISTO:       'listo',
  POR_COBRAR:  'por_cobrar',
  PAGADO:      'pagado',
}

export const ESTADO_LABELS = {
  pendiente:   'Pendiente',
  listo:       '¡Listo!',
  por_cobrar:  'Por cobrar',
  pagado:      'Pagado',
}

export const ESTADO_COLORS = {
  pendiente:   'bg-amber-100 text-amber-800 border-amber-300',
  listo:       'bg-green-100 text-green-800 border-green-300',
  por_cobrar:  'bg-blue-100 text-blue-800 border-blue-300',
  pagado:      'bg-gray-100 text-gray-500 border-gray-200',
}

// ─── API helpers ──────────────────────────────────────────────────────────────

/** Crea una sala nueva y devuelve { sala, error } */
export async function crearSala(nombre, numMesas) {
  const { data, error } = await supabase
    .rpc('crear_sala', { p_nombre: nombre, p_mesas: numMesas })
  return { sala: data, error }
}

/** Busca sala por PIN activo */
export async function buscarSalaPorPin(pin) {
  const { data, error } = await supabase
    .from('salas')
    .select('*')
    .eq('pin', pin)
    .eq('activa', true)
    .single()
  return { sala: data, error }
}

/** Registra un mesero en una sala */
export async function registrarMesero(salaId, nombre) {
  const { data, error } = await supabase
    .from('meseros')
    .insert({ sala_id: salaId, nombre })
    .select()
    .single()
  return { mesero: data, error }
}

/** Envía una nueva comanda a cocina */
export async function enviarComanda(salaId, meseroId, mesa, detalle) {
  const { data, error } = await supabase
    .rpc('nueva_comanda', {
      p_sala_id:   salaId,
      p_mesero_id: meseroId,
      p_mesa:      mesa,
      p_detalle:   detalle,
    })
  return { comanda: data, error }
}

/** Transiciona el estado de una comanda */
export async function actualizarEstado(comandaId, nuevoEstado) {
  const updates = { estado: nuevoEstado }
  if (nuevoEstado === ESTADOS.LISTO)      updates.listo_at = new Date().toISOString()
  if (nuevoEstado === ESTADOS.PAGADO)     updates.cobrado_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('comandas')
    .update(updates)
    .eq('id', comandaId)
    .select()
    .single()
  return { comanda: data, error }
}

/** Edita el detalle de una comanda pendiente */
export async function editarComanda(comandaId, nuevoDetalle) {
  const { data, error } = await supabase
    .from('comandas')
    .update({ detalle: nuevoDetalle })
    .eq('id', comandaId)
    .eq('estado', ESTADOS.PENDIENTE)
    .select()
    .single()
  return { comanda: data, error }
}

/** Carga comandas activas de una sala (excluye pagadas) */
export async function cargarComandas(salaId) {
  const { data, error } = await supabase
    .from('comandas')
    .select(`
      *,
      mesero:meseros (id, nombre)
    `)
    .eq('sala_id', salaId)
    .neq('estado', ESTADOS.PAGADO)
    .order('created_at', { ascending: true })
  return { comandas: data ?? [], error }
}

/** Cierra una sala */
export async function cerrarSala(salaId) {
  const { error } = await supabase
    .from('salas')
    .update({ activa: false, cerrada_at: new Date().toISOString() })
    .eq('id', salaId)
  return { error }
}
