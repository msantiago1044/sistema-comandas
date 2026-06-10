// src/components/VistaCocina.jsx
// Tablero de control de la cocina — vista en tiempo real + historial paginado

import { memo, useState, useEffect, useCallback } from 'react'
import { ESTADOS, cargarHistorial } from '../lib/supabase'

// ─── Tarjeta pendiente ────────────────────────────────────────────────────────
const TarjetaComandaCocina = memo(function TarjetaComandaCocina({
  comanda, onMarcarListo
}) {
  const ahora   = new Date()
  const creada  = new Date(comanda.created_at)
  const minutos = Math.floor((ahora - creada) / 60_000)
  const urgente = minutos >= 10

  return (
    <div className={`rounded-2xl border-2 p-4 bg-white transition-all hover:shadow-lg
      ${urgente ? 'border-red-300 shadow-red-100' : 'border-gray-200'}`}>

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-xl text-gray-800">
            #{comanda.serial}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-sm font-bold
            ${urgente
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-orange-100 text-orange-700 border border-orange-300'}`}>
            Mesa {comanda.mesa}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">
            {new Date(comanda.created_at).toLocaleTimeString('es', {
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
          <p className={`text-xs font-bold mt-0.5 ${urgente ? 'text-red-600' : 'text-gray-400'}`}>
            {minutos === 0 ? 'Ahora' : `${minutos}m`}{urgente ? ' ⚠️' : ''}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-2 font-medium">
        👤 {comanda.mesero?.nombre ?? '—'}
      </p>

      <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap
                    bg-gray-50 rounded-xl px-3 py-2 font-medium min-h-[3rem]">
        {comanda.detalle}
      </p>

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

// ─── Fila de historial ────────────────────────────────────────────────────────
const FilaHistorial = memo(function FilaHistorial({ comanda }) {
  const pagadoEn = comanda.cobrado_at
    ? new Date(comanda.cobrado_at).toLocaleString('es', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit'
      })
    : '—'

  const creadoEn = new Date(comanda.created_at).toLocaleTimeString('es', {
    hour: '2-digit', minute: '2-digit'
  })

  // Tiempo total en minutos desde creado hasta pagado
  let duracion = '—'
  if (comanda.cobrado_at) {
    const mins = Math.round(
      (new Date(comanda.cobrado_at) - new Date(comanda.created_at)) / 60_000
    )
    duracion = `${mins}m`
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-800
                    hover:bg-gray-800/50 transition-colors">
      {/* Serial + mesa */}
      <div className="flex-shrink-0 w-28">
        <span className="font-mono font-black text-amber-400 text-sm">
          #{comanda.serial}
        </span>
        <p className="text-xs text-gray-500 mt-0.5">Mesa {comanda.mesa}</p>
      </div>

      {/* Detalle */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 leading-snug line-clamp-2">
          {comanda.detalle}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          👤 {comanda.mesero?.nombre ?? '—'}
        </p>
      </div>

      {/* Tiempos */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-gray-400">{pagadoEn}</p>
        <p className="text-xs text-gray-600 mt-0.5">
          ⏱ {duracion}
        </p>
      </div>
    </div>
  )
})

// ─── Panel de historial ───────────────────────────────────────────────────────
function PanelHistorial({ salaId }) {
  const [historial, setHistorial]   = useState([])
  const [total, setTotal]           = useState(0)
  const [pagina, setPagina]         = useState(0)
  const [cargando, setCargando]     = useState(false)
  const [filtroMesa, setFiltroMesa] = useState('')
  const [filtroTexto, setFiltroTexto] = useState('')
  const POR_PAGINA = 30

  const cargar = useCallback(async (pag = 0) => {
    setCargando(true)
    const { historial: data, total: tot } = await cargarHistorial(salaId, pag, POR_PAGINA)
    setHistorial(data)
    setTotal(tot)
    setPagina(pag)
    setCargando(false)
  }, [salaId])

  useEffect(() => { cargar(0) }, [cargar])

  // Filtrado local (sobre la página cargada)
  const filtrados = historial.filter(c => {
    const mesaOk  = filtroMesa  ? c.mesa === Number(filtroMesa) : true
    const textoOk = filtroTexto
      ? c.detalle.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        c.serial.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (c.mesero?.nombre ?? '').toLowerCase().includes(filtroTexto.toLowerCase())
      : true
    return mesaOk && textoOk
  })

  const totalPaginas = Math.ceil(total / POR_PAGINA)

  // Resumen de la sesión
  const totalComandas = total
  const mesasUnicas   = new Set(historial.map(c => c.mesa)).size

  return (
    <div className="flex flex-col h-full">

      {/* Resumen estadístico */}
      <div className="grid grid-cols-3 gap-3 px-4 pt-4 pb-3">
        <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
          <p className="text-2xl font-black text-amber-400">{totalComandas}</p>
          <p className="text-xs text-gray-500 mt-0.5">Comandas totales</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
          <p className="text-2xl font-black text-green-400">{mesasUnicas}</p>
          <p className="text-xs text-gray-500 mt-0.5">Mesas atendidas</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
          <p className="text-2xl font-black text-sky-400">
            {historial.length > 0
              ? Math.round(
                  historial
                    .filter(c => c.cobrado_at)
                    .reduce((acc, c) =>
                      acc + (new Date(c.cobrado_at) - new Date(c.created_at)) / 60_000, 0
                    ) / Math.max(historial.filter(c => c.cobrado_at).length, 1)
                ) + 'm'
              : '—'
            }
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Tiempo promedio</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 px-4 pb-3">
        <input
          type="text"
          placeholder="🔍 Buscar serial, detalle, mesero…"
          value={filtroTexto}
          onChange={e => setFiltroTexto(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700
                     text-gray-300 text-sm placeholder:text-gray-600
                     focus:outline-none focus:border-amber-500"
        />
        <input
          type="number"
          placeholder="Mesa"
          value={filtroMesa}
          onChange={e => setFiltroMesa(e.target.value)}
          min={1}
          className="w-20 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700
                     text-gray-300 text-sm placeholder:text-gray-600
                     focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={() => cargar(0)}
          className="px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600
                     text-gray-300 text-sm transition-colors"
        >
          ↺
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {cargando ? (
          <div className="flex items-center justify-center h-40 gap-3 text-gray-500">
            <div className="w-6 h-6 border-3 border-amber-500 border-t-transparent
                            rounded-full animate-spin border-[3px]" />
            Cargando historial…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm">
              {historial.length === 0
                ? 'Sin comandas pagadas aún en esta sesión'
                : 'Sin resultados para ese filtro'}
            </p>
          </div>
        ) : (
          <>
            {/* Cabecera */}
            <div className="flex gap-3 px-4 py-2 text-xs font-semibold text-gray-600
                            uppercase tracking-wide border-b border-gray-800">
              <span className="w-28">Serial / Mesa</span>
              <span className="flex-1">Detalle</span>
              <span className="w-24 text-right">Pagado / Duración</span>
            </div>
            {filtrados.map(c => (
              <FilaHistorial key={c.id} comanda={c} />
            ))}
          </>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-4 py-3
                        border-t border-gray-800 bg-gray-900">
          <button
            onClick={() => cargar(pagina - 1)}
            disabled={pagina === 0}
            className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm
                       disabled:opacity-30 hover:bg-gray-700 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-500">
            Página {pagina + 1} de {totalPaginas} · {total} comandas
          </span>
          <button
            onClick={() => cargar(pagina + 1)}
            disabled={pagina >= totalPaginas - 1}
            className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm
                       disabled:opacity-30 hover:bg-gray-700 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Vista principal de cocina ────────────────────────────────────────────────
export default function VistaCocina({
  sala,
  pendientes,
  cargando,
  onMarcarListo,
  onCerrarSala,
}) {
  const [tab, setTab] = useState('activas') // 'activas' | 'historial'

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
          {pendientes.length > 0 && tab !== 'activas' && (
            <span className="bg-amber-500 text-white text-xs font-bold
                             px-2.5 py-1 rounded-full animate-pulse">
              {pendientes.length} nuevo{pendientes.length > 1 ? 's' : ''}
            </span>
          )}
          <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5">
            <p className="text-xs text-gray-400 leading-none">PIN</p>
            <p className="font-mono font-black text-amber-400 tracking-widest leading-tight">
              {sala.pin}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-800 border-b border-gray-700">
        <button
          onClick={() => setTab('activas')}
          className={`flex-1 py-3 text-sm font-bold transition-colors relative
            ${tab === 'activas'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-gray-500 hover:text-gray-300'}`}
        >
          🔥 En cocina
          {pendientes.length > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-xs
                             px-1.5 py-0.5 rounded-full font-black">
              {pendientes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`flex-1 py-3 text-sm font-bold transition-colors
            ${tab === 'historial'
              ? 'text-sky-400 border-b-2 border-sky-400'
              : 'text-gray-500 hover:text-gray-300'}`}
        >
          📋 Historial
        </button>
        <button
          onClick={onCerrarSala}
          className="px-4 py-3 text-xs text-red-500 hover:text-red-400
                     transition-colors font-medium"
        >
          Cerrar sala
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* Tab: comandas activas */}
        {tab === 'activas' && (
          <div className="flex-1 overflow-y-auto p-4">
            {cargando ? (
              <div className="flex flex-col items-center justify-center h-64
                              gap-4 text-gray-500">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent
                                rounded-full animate-spin" />
                <p>Conectando…</p>
              </div>
            ) : pendientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64
                              text-gray-600">
                <div className="text-6xl mb-4">😌</div>
                <p className="text-xl font-bold">Cocina al día</p>
                <p className="text-sm mt-1">Sin pedidos pendientes</p>
                <button
                  onClick={() => setTab('historial')}
                  className="mt-4 text-sm text-sky-500 hover:text-sky-400 underline"
                >
                  Ver historial →
                </button>
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
        )}

        {/* Tab: historial */}
        {tab === 'historial' && (
          <PanelHistorial salaId={sala.id} />
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2
                      flex items-center gap-2 text-xs text-gray-500">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Conectado en tiempo real · {sala.num_mesas} mesas
      </div>
    </div>
  )
}
