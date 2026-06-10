// src/components/PantallaInicio.jsx
// Selección de rol (Cocina vs Mesero) + formularios de entrada

import { useState, memo } from 'react'

// ─── Sub-componente: Formulario Cocina ────────────────────────────────────────
const FormCocina = memo(function FormCocina({ onCrear, cargando, error }) {
  const [nombre, setNombre]     = useState('Mi Restaurante')
  const [numMesas, setNumMesas] = useState(10)

  function handleSubmit(e) {
    e.preventDefault()
    if (nombre.trim() && numMesas >= 1) onCrear(nombre, numMesas)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Nombre del restaurante
        </label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Mi Restaurante"
          maxLength={60}
          required
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900
                     focus:outline-none focus:ring-2 focus:ring-orange-400 text-base"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Número de mesas
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1} max={100}
            value={numMesas}
            onChange={e => setNumMesas(Number(e.target.value))}
            className="flex-1 accent-orange-500"
          />
          <span className="w-12 text-center text-2xl font-bold text-orange-600">
            {numMesas}
          </span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={cargando}
        className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-95
                   text-white text-lg font-bold transition-all disabled:opacity-60
                   shadow-lg shadow-orange-200"
      >
        {cargando ? '⏳ Creando sala…' : '🍳 Abrir sala de cocina'}
      </button>
    </form>
  )
})

// ─── Sub-componente: Formulario Mesero ────────────────────────────────────────
const FormMesero = memo(function FormMesero({ onConectar, cargando, error }) {
  const [nombre, setNombre] = useState('')
  const [pin, setPin]       = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (nombre.trim() && pin.length === 4) onConectar(pin, nombre)
  }

  function handlePinChange(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(val)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Tu nombre
        </label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Carlos, María…"
          maxLength={40}
          required
          autoComplete="given-name"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900
                     focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          PIN de sala (4 dígitos)
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{4}"
          value={pin}
          onChange={handlePinChange}
          placeholder="0000"
          required
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900
                     text-center text-3xl font-mono tracking-[0.5em]
                     focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={cargando || pin.length < 4 || !nombre.trim()}
        className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-95
                   text-white text-lg font-bold transition-all disabled:opacity-60
                   shadow-lg shadow-sky-200"
      >
        {cargando ? '⏳ Conectando…' : '🙋 Entrar como mesero'}
      </button>
    </form>
  )
})

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PantallaInicio({
  onCrearSala,
  onConectarMesero,
  cargando,
  error,
}) {
  const [tab, setTab] = useState(null) // null | 'cocina' | 'mesero'

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-sky-50 flex flex-col
                    items-center justify-center p-4">

      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🔔</div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Comanda</h1>
        <p className="text-gray-500 mt-1">Sistema de comandas en tiempo real</p>
      </div>

      {/* Selector de rol */}
      {!tab && (
        <div className="w-full max-w-xs space-y-4">
          <button
            onClick={() => setTab('cocina')}
            className="w-full py-5 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-95
                       text-white text-xl font-bold transition-all shadow-xl shadow-orange-200
                       flex items-center justify-center gap-3"
          >
            <span className="text-3xl">🍳</span>
            Soy la Cocina / Admin
          </button>

          <button
            onClick={() => setTab('mesero')}
            className="w-full py-5 rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-95
                       text-white text-xl font-bold transition-all shadow-xl shadow-sky-200
                       flex items-center justify-center gap-3"
          >
            <span className="text-3xl">🙋</span>
            Soy Mesero
          </button>
        </div>
      )}

      {/* Formulario Cocina */}
      {tab === 'cocina' && (
        <div className="w-full max-w-xs bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setTab(null)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >←</button>
            <h2 className="text-lg font-bold text-gray-800">Nueva sala</h2>
          </div>
          <FormCocina onCrear={onCrearSala} cargando={cargando} error={error} />
        </div>
      )}

      {/* Formulario Mesero */}
      {tab === 'mesero' && (
        <div className="w-full max-w-xs bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setTab(null)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >←</button>
            <h2 className="text-lg font-bold text-gray-800">Unirse a sala</h2>
          </div>
          <FormMesero onConectar={onConectarMesero} cargando={cargando} error={error} />
        </div>
      )}

      <p className="text-xs text-gray-400 mt-8">PWA · Funciona sin instalar</p>
    </div>
  )
}
