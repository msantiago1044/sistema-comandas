// src/App.jsx
// Componente raíz — orquesta sesión, vistas y acciones

import { useSesion }   from './hooks/useSesion'
import { useComandas } from './hooks/useComandas'
import PantallaInicio  from './components/PantallaInicio'
import VistaMesero     from './components/VistaMesero'
import VistaCocina     from './components/VistaCocina'

export default function App() {
  const {
    sesion, inicializado,
    cargando, error,
    esCocina, esMesero,
    sala, mesero,
    iniciarSalaCocina,
    conectarMesero,
    finalizarSala,
    desconectarMesero,
  } = useSesion()

  const {
    pendientes,
    misComandas,
    cargando: cargandoComandas,
    marcarListo,
    marcarPorCobrar,
    marcarPagado,
    editarDetalle,
  } = useComandas(sala?.id ?? null, mesero?.id ?? null)

  // Esperar a que se restaure la sesión local antes de renderizar
  if (!inicializado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent
                        rounded-full animate-spin" />
      </div>
    )
  }

  if (esCocina && sala) {
    return (
      <VistaCocina
        sala={sala}
        pendientes={pendientes}
        cargando={cargandoComandas}
        onMarcarListo={marcarListo}
        onCerrarSala={finalizarSala}
      />
    )
  }

  if (esMesero && sala && mesero) {
    return (
      <VistaMesero
        sala={sala}
        mesero={mesero}
        misComandas={misComandas}
        onEditar={editarDetalle}
        onPorCobrar={marcarPorCobrar}
        onPagado={marcarPagado}
        onDesconectar={desconectarMesero}
      />
    )
  }

  return (
    <PantallaInicio
      onCrearSala={iniciarSalaCocina}
      onConectarMesero={conectarMesero}
      cargando={cargando}
      error={error}
    />
  )
}
