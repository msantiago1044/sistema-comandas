// src/components/VistaMesero.jsx
// Libreta digital del mesero + lista de sus comandas activas

import { useState, memo, useCallback } from 'react'
import { enviarComanda } from '../lib/supabase'
import { vibrarCorto } from '../lib/notificaciones'
import { ESTADOS, ESTADO_LABELS } from '../lib/supabase'

// ─── Badge de estado ──────────────────────────────────────────────────────────
const BadgeEstado = memo(function BadgeEstado({ estado }) {
  const colores = {
    pendiente:  'bg-amber-100 text-amber-700 border border-amber-300',
    listo:      'bg-green-100 text-green-700 border border-green-400 animate-pulse',
    por_cobrar: 'bg-blue-100  text-blue-700  border border-blue-300',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colores[estado] ?? ''}`}>
      {ESTADO_LABELS[estado]}
    </span>
  )
})

// ─── Tarjeta de comanda del mesero ────────────────────────────────────────────
const TarjetaComandaMesero = memo(function TarjetaComandaMesero({
  comanda,
  onEditar,
  onPorCobrar,
  onPagado,
}) {
  const [editando, setEditando]     = useState(false)
  const [textoEdit, setTextoEdit]   = useState(comanda.detalle)

  function guardarEdicion() {
    if (textoEdit.trim() && textoEdit !== comanda.detalle) {
      onEditar(comanda.id, textoEdit.trim())
    }
    setEditando(false)
  }

  const esListo     = comanda.estado === ESTADOS.LISTO
  const esPorCobrar = comanda.estado === ESTADOS.POR_COBRAR
  const esPendiente = comanda.estado === ESTADOS.PENDIENTE

  return (
    <div className={`rounded-2xl border-2 p-4 transition-all
      ${esListo     ? 'border-green-400 bg-green-50 shadow-lg shadow-green-100' : ''}
      ${esPendiente ? 'border-amber-200 bg-white' : ''}
      ${esPorCobrar ? 'border-blue-300  bg-blue-50' : ''}
    `}>
      {/* Header de tarjeta */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-gray-700 text-base">
            #{comanda.serial}
          </span>
          <span className="text-sm text-gray-500">Mesa {comanda.mesa}</span>
        </div>
        <BadgeEstado estado={comanda.estado} />
      </div>

      {/* Detalle (editable si está pendiente) */}
      {editando ? (
        <div className="space-y-2">
          <textarea
            value={textoEdit}
            onChange={e => setTextoEdit(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-xl border-2 border-sky-300 text-sm
                       focus:outline-none focus:border-sky-500 resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={guardarEdicion}
              className="flex-1 py-2 rounded-xl bg-sky-500 text-white text-sm font-bold"
            >Guardar</button>
            <button
              onClick={() => { setEditando(false); setTextoEdit(comanda.detalle) }}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm"
            >Cancelar</button>
          </div>
        </div>
      ) : (
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
          {comanda.detalle}
        </p>
      )}

      {/* Hora */}
      <p className="text-xs text-gray-400 mt-2">
        {new Date(comanda.created_at).toLocaleTimeString('es', {
          hour: '2-digit', minute: '2-digit'
        })}
      </p>

      {/* Acciones */}
      {!editando && (
        <div className="flex gap-2 mt-3">
          {esPendiente && (
            <button
              onClick={() => setEditando(true)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600
                         text-xs font-medium hover:bg-gray-50 active:scale-95 transition-all"
            >
              ✏️ Editar
            </button>
          )}

          {esListo && (
            <button
              onClick={() => onPorCobrar(comanda.id)}
              className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-600
                         text-white text-sm font-bold active:scale-95 transition-all
                         shadow-md shadow-blue-200"
            >
              🍽️ Entregado — Cobrar
            </button>
          )}

          {esPorCobrar && (
            <button
              onClick={() => onPagado(comanda.id)}
              className="flex-1 py-2 rounded-xl bg-gray-800 hover:bg-gray-900
                         text-white text-sm font-bold active:scale-95 transition-all"
            >
              ✅ Pagado
            </button>
          )}
        </div>
      )}
    </div>
  )
})

// ─── Formulario de nueva comanda ──────────────────────────────────────────────
const FormNuevaComanda = memo(function FormNuevaComanda({
  salaId, meseroId, numMesas, onComandaEnviada
}) {
  const [mesa, setMesa]         = useState(1)
  const [detalle, setDetalle]   = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk]             = useState(null) // serial del último envío

  const handleEnviar = useCallback(async () => {
    if (!detalle.trim()) return
    setEnviando(true)
    const { comanda, error } = await enviarComanda(salaId, meseroId, mesa, detalle.trim())
    setEnviando(false)

    if (!error && comanda) {
      vibrarCorto()
      setOk(comanda.serial)
      setDetalle('')
      setTimeout(() => setOk(null), 2500)
      onComandaEnviada?.()
    }
  }, [salaId, meseroId, mesa, detalle, onComandaEnviada])

  // Opciones de mesa: array [1..numMesas]
  const opcionesMesa = Array.from({ length: numMesas }, (_, i) => i + 1)

  return (
    <div className="bg-white rounded-3xl shadow-lg p-5 border border-gray-100">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span>📝</span> Nueva comanda
      </h3>

      {/* Selector de mesa */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Mesa
        </label>
        <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto">
          {opcionesMesa.map(n => (
            <button
              key={n}
              onClick={() => setMesa(n)}
              className={`py-2 rounded-xl text-sm font-bold transition-all active:scale-90
                ${mesa === n
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-orange-100'
                }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Área de texto libre */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Detalles del pedido
        </label>
        <textarea
          value={detalle}
          onChange={e => setDetalle(e.target.value)}
          rows={4}
          placeholder="Ej: 2x Lomo saltado sin cebolla
1x Chicha morada grande
1x Arroz chaufa de pollo…"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-gray-800
                     focus:outline-none focus:border-orange-400 text-base leading-relaxed
                     resize-none placeholder:text-gray-300 font-medium"
        />
      </div>

      {/* Feedback de éxito */}
      {ok && (
        <div className="mb-3 px-4 py-2 bg-green-50 border border-green-300 rounded-xl
                        text-green-700 text-sm font-bold text-center animate-bounce">
          ✅ Comanda <span className="font-mono">#{ok}</span> enviada a cocina
        </div>
      )}

      {/* Botón de envío */}
      <button
        onClick={handleEnviar}
        disabled={enviando || !detalle.trim()}
        className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-95
                   text-white text-lg font-black transition-all disabled:opacity-50
                   shadow-xl shadow-orange-200 flex items-center justify-center gap-2"
      >
        {enviando
          ? <><span className="animate-spin">⏳</span> Enviando…</>
          : <><span>🔔</span> Enviar a Cocina — Mesa {mesa}</>
        }
      </button>
    </div>
  )
})

// ─── Vista principal del mesero ───────────────────────────────────────────────
export default function VistaMesero({
  sala, mesero,
  misComandas,
  onEditar, onPorCobrar, onPagado,
  onDesconectar,
}) {
  const [tab, setTab] = useState('nueva') // 'nueva' | 'mis'

  const pendientesCount = misComandas.filter(c => c.estado === ESTADOS.PENDIENTE).length
  const listosCount     = misComandas.filter(c => c.estado === ESTADOS.LISTO).length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center
                      justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <p className="text-xs text-gray-400">{sala.nombre}</p>
          <p className="font-bold text-gray-800">👤 {mesero.nombre}</p>
        </div>
        <div className="flex items-center gap-3">
          {listosCount > 0 && (
            <span className="bg-green-500 text-white text-xs font-bold
                             px-2.5 py-1 rounded-full animate-bounce">
              {listosCount} listo{listosCount > 1 ? 's' : ''}!
            </span>
          )}
          <button
            onClick={onDesconectar}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100">
        <button
          onClick={() => setTab('nueva')}
          className={`flex-1 py-3 text-sm font-bold transition-colors
            ${tab === 'nueva'
              ? 'text-orange-600 border-b-2 border-orange-500'
              : 'text-gray-400'}`}
        >
          📝 Nueva comanda
        </button>
        <button
          onClick={() => setTab('mis')}
          className={`flex-1 py-3 text-sm font-bold transition-colors relative
            ${tab === 'mis'
              ? 'text-sky-600 border-b-2 border-sky-500'
              : 'text-gray-400'}`}
        >
          📋 Mis órdenes
          {(pendientesCount + listosCount) > 0 && (
            <span className="absolute top-2 right-4 bg-red-500 text-white
                             text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {pendientesCount + listosCount}
            </span>
          )}
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'nueva' && (
          <FormNuevaComanda
            salaId={sala.id}
            meseroId={mesero.id}
            numMesas={sala.num_mesas}
            onComandaEnviada={() => setTab('mis')}
          />
        )}

        {tab === 'mis' && (
          <div className="space-y-3">
            {misComandas.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">🍽️</div>
                <p className="text-sm">Sin comandas activas</p>
              </div>
            ) : (
              // Ordenar: listos primero, luego por_cobrar, luego pendientes
              [...misComandas]
                .sort((a, b) => {
                  const orden = { listo: 0, por_cobrar: 1, pendiente: 2 }
                  return (orden[a.estado] ?? 3) - (orden[b.estado] ?? 3)
                })
                .map(comanda => (
                  <TarjetaComandaMesero
                    key={comanda.id}
                    comanda={comanda}
                    onEditar={onEditar}
                    onPorCobrar={onPorCobrar}
                    onPagado={onPagado}
                  />
                ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
