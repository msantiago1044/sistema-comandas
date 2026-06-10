// src/components/VistaCocina.jsx
// Tablero de control de la cocina — vista en tiempo real de todos los pedidos

import { memo, useState } from 'react'
import { ESTADOS } from '../lib/supabase'

// ─── Tarjeta de comanda para cocina ──────────────────────────────────────────
const TarjetaComandaCocina = memo(function TarjetaComandaCocina({
  comanda, onMarcarListo
}) {
  const ahora   = new Date()
  const creada  = new Date(comanda.created_at)
  const minutos = Math.floor((ahora - creada) / 60_000)
  const urgente = minutos >= 10

  return (
    <div className={`rounded-2xl border-2 p-4 bg-white transition-all
                     hover:shadow-lg group
      ${urgente ? 'border-red-300 shadow-red-100' : 'border-gray-200'}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-xl text-gray-800">
            #{comanda.serial}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-sm font-bold
            ${urgente
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-orange-100 text-orange-700 border border-orange-300'
            }`}>
            Mesa {comanda.mesa}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">
            {new Date(comanda.created_at).toLocaleTimeString('es', {
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
          <p className={`text-xs font-bold mt-0.5
            ${urgente ? 'text-red-600' : 'text-gray-400'}`}>
            {minutos === 0 ? 'Ahora' : `${minutos}m`}
            {urgente ? ' ⚠️' : ''}
          </p>
        </div>
      </div>

      {/* Mesero */}
      <p className="text-xs text-gray-500 mb-2 font-medium">
        👤 {comanda.mesero?.nombre ?? '—'}
      </p>

      {/* Detalle del pedido */}
      <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap
                    bg-gray-50 rounded-xl px-3 py-2 font-medium min-h-[3rem]">
        {comanda.detalle}
      </p>

      {/* Botón de acción */}
      <button
        onClick={() => onMarcarListo(comanda.id)}
        className="w-full mt-4 py-3 rounded-2xl bg-green-500 hover:bg-green-600
                   active:scale-95 text-white font-black text-base transition-all
                   shadow-lg shadow-green-200 flex items-center justify-center gap-2"
      >
        <span>✅</span> ¡Listo! — Avisar mesero
      </button>
    </div>
  )
})

// ─── Panel del PIN de sala ────────────────────────────────────────────────────
const PanelPin = memo(function PanelPin({ sala, onCerrar }) {
  const [mostrar, setMostrar] = useState(false)

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
            PIN de sala
          </p>
          <p
            onClick={() => setMostrar(v => !v)}
            className="font-mono font-black text-3xl text-orange-700 cursor-pointer
                       tracking-[0.2em] select-all"
          >
            {mostrar ? sala.pin : '••••'}
          </p>
          <p className="text-xs text-orange-500 mt-0.5">
            {mostrar ? 'Toca para ocultar' : 'Toca para mostrar'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{sala.nombre}</p>
          <p className="text-xs text-gray-500">{sala.num_mesas} mesas</p>
          <button
            onClick={onCerrar}
            className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Cerrar sala
          </button>
        </div>
      </div>
    </div>
  )
})

// ─── Vista principal de cocina ────────────────────────────────────────────────
export default function VistaCocina({
  sala,
  pendientes,
  cargando,
  onMarcarListo,
  onCerrarSala,
}) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3
                      flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍳</span>
          <div>
            <p className="font-black text-lg leading-tight">{sala.nombre}</p>
            <p className="text-xs text-gray-400">Tablero de Cocina</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Contador de pendientes */}
          <div className={`px-3 py-1.5 rounded-xl text-sm font-bold
            ${pendientes.length > 0
              ? 'bg-amber-500 text-white animate-pulse'
              : 'bg-gray-700 text-gray-400'
            }`}>
            {pendientes.length > 0
              ? `${pendientes.length} pedido${pendientes.length > 1 ? 's' : ''}`
              : 'Cocina libre'
            }
          </div>
        </div>
      </div>

      {/* Info de sala + PIN */}
      <div className="px-4 pt-4">
        <div className="bg-gray-800 rounded-2xl p-4 flex items-center justify-between
                        border border-gray-700">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
              PIN de sala
            </p>
            <p className="font-mono font-black text-4xl tracking-[0.3em] text-amber-400">
              {sala.pin}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{sala.num_mesas} mesas</p>
            <button
              onClick={onCerrarSala}
              className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Cerrar sala
            </button>
          </div>
        </div>
      </div>

      {/* Grid de comandas */}
      <div className="flex-1 p-4">
        {cargando ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent
                            rounded-full animate-spin" />
            <p>Conectando…</p>
          </div>
        ) : pendientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600">
            <div className="text-6xl mb-4">😌</div>
            <p className="text-xl font-bold">Cocina al día</p>
            <p className="text-sm mt-1">Sin pedidos pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                          xl:grid-cols-4 gap-4">
            {pendientes.map(comanda => (
              <TarjetaComandaCocina
                key={comanda.id}
                comanda={comanda}
                onMarcarListo={onMarcarListo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer de estado */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2
                      flex items-center gap-2 text-xs text-gray-500">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Conectado en tiempo real
      </div>
    </div>
  )
}
