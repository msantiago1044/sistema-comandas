# 🔔 Comanda — Sistema de Comandas Multi-Restaurante

PWA ultra-rápida estilo Kahoot para comunicación mesero↔cocina.  
Sin fricción, sin cuentas, con superpoderes digitales.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite + React 18 + Tailwind CSS |
| Backend / Tiempo Real | Supabase (PostgreSQL + Realtime WebSockets) |
| APIs Nativas | Web Audio API · Vibration API · Notifications API |

---

## Arquitectura — Máquina de Estados

```
                    ┌──────────────────────────────────────┐
                    │             COCINA (Admin)            │
                    │  Crea sala → genera PIN de 4 dígitos  │
                    └─────────────────┬────────────────────┘
                                      │ PIN
                    ┌─────────────────▼────────────────────┐
                    │           MESERO (N dispositivos)     │
                    │  Ingresa nombre + PIN → conectado     │
                    └─────────────────┬────────────────────┘
                                      │
            ┌─────────────────────────▼──────────────────────────┐
            │                 CICLO DE COMANDA                    │
            │                                                     │
            │  [PENDIENTE] ──→ [LISTO] ──→ [POR_COBRAR] ──→ [PAGADO]
            │                                                     │
            │  Mesero escribe   Cocina      Mesero entrega   Mesero confirma
            │  en libreta libre  marca OK    y ancla cobro    → va al log
            └─────────────────────────────────────────────────────┘
```

### Notificaciones Bidireccionales

| Evento | Destino | Mecanismo |
|--------|---------|-----------|
| Nueva comanda llega | Cocina | 🔔 Campana (Web Audio) + ⚡ Flash visual |
| Cocina marca "Listo" | Mesero responsable | 📳 Vibración larga + 🔊 Pitido + 🔔 Push Notification |

---

## Instalación

### 1. Clonar y preparar

```bash
git clone <repo>
cd sistema-comandas
npm install
cp .env.example .env.local
```

### 2. Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Copiar **Project URL** y **anon key** desde *Settings → API*
3. Pegar en `.env.local`

### 3. Ejecutar el esquema SQL

En el **SQL Editor** de Supabase, pegar y ejecutar el contenido de:
```
supabase/schema.sql
```

Esto crea:
- Tablas `salas`, `meseros`, `comandas`
- Funciones `crear_sala()`, `nueva_comanda()`, `generar_serial()`
- Políticas RLS para aislar datos por sala
- Publicación Realtime en las tablas principales

### 4. Activar Realtime en Supabase Dashboard

*Database → Replication → supabase_realtime* →  
Verificar que `comandas` y `meseros` estén marcadas ✅

### 5. Correr en desarrollo

```bash
npm run dev
# Disponible en http://localhost:5173
# Y en tu red local: http://192.168.x.x:5173 (para móviles)
```

### 6. Build de producción

```bash
npm run build
# Carpeta dist/ lista para Vercel / Netlify / Cloudflare Pages
```

---

## Estructura de Archivos

```
src/
├── lib/
│   ├── supabase.js        # Cliente, tipos, helpers de BD
│   └── notificaciones.js  # Web Audio + Vibration + Notifications APIs
├── hooks/
│   ├── useSesion.js       # Gestión de sesión (sala/mesero) con localStorage
│   └── useComandas.js     # Suscripción Realtime + CRUD optimizado
├── components/
│   ├── PantallaInicio.jsx # Selector de rol + formularios de entrada
│   ├── VistaMesero.jsx    # Libreta digital + lista de comandas propias
│   └── VistaCocina.jsx    # Tablero de control en tiempo real
├── App.jsx                # Orquestador principal
├── main.jsx
└── index.css              # Tailwind + animación flash de alerta

supabase/
└── schema.sql             # Todo el DDL: tablas, funciones, RLS, Realtime
```

---

## Optimizaciones de Performance

- **Realtime incremental**: El canal WebSocket solo suscribe cambios; la carga inicial es una sola query con JOIN.
- **Optimistic updates**: Los cambios de estado se aplican localmente antes de confirmar con la BD (sin esperar latencia de red).
- **memo() en tarjetas**: `TarjetaComandaCocina` y `TarjetaComandaMesero` no re-renderizan si sus props no cambian.
- **useCallback en acciones**: Las funciones de acción son estables entre renders.
- **Set de alertas deduplicadas**: `alertadosRef` evita que la vibración/sonido se dispare dos veces por el mismo evento.
- **Filtrado en el cliente**: Las vistas (pendientes, misComandas) son derivaciones del estado principal sin queries adicionales.

---

## Despliegue en Vercel (recomendado)

```bash
npm i -g vercel
vercel --prod
# Agregar las variables de entorno en el dashboard de Vercel
```

---

## Roadmap / Mejoras futuras

- [ ] QR code dinámico con el PIN (usando `qrcode` lib)
- [ ] Vista de historial paginado (comandas pagadas)
- [ ] Múltiples categorías de pedido (bebidas, entrada, plato, postre)
- [ ] Tiempo promedio de cocina por turno (analytics)
- [ ] Modo dark para la vista del mesero
- [ ] Service Worker para funcionamiento offline parcial
