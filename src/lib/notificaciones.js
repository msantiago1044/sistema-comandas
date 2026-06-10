// src/lib/notificaciones.js
// APIs Nativas: Web Audio API + Vibration API + Notifications API

// ─── Web Audio API ─────────────────────────────────────────────────────────
let audioCtx = null

function getAudioCtx() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  // Desbloquear el contexto si está suspendido (política de autoplay)
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

/**
 * Toca una campana (timbre de cocina)
 * Frecuencias: ding → dong → ding rápido
 */
export function tocarCampanaCocina() {
  try {
    const ctx = getAudioCtx()
    const now = ctx.currentTime

    const notas = [
      { freq: 1046.5, t: 0,    dur: 0.6 },  // C6
      { freq:  880.0, t: 0.15, dur: 0.5 },  // A5
      { freq: 1174.7, t: 0.30, dur: 0.8 },  // D6
    ]

    notas.forEach(({ freq, t, dur }) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + t)

      gain.gain.setValueAtTime(0, now + t)
      gain.gain.linearRampToValueAtTime(0.4, now + t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur)

      osc.start(now + t)
      osc.stop(now + t + dur)
    })
  } catch (e) {
    console.warn('[Audio] No disponible:', e.message)
  }
}

/**
 * Pitido corto de confirmación (para el mesero al recibir "listo")
 */
export function tocarPitidoMesero() {
  try {
    const ctx = getAudioCtx()
    const now = ctx.currentTime

    ;[[880, 0, 0.12], [1100, 0.13, 0.18]].forEach(([freq, t, dur]) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, now + t)
      gain.gain.setValueAtTime(0.15, now + t)
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur)
      osc.start(now + t)
      osc.stop(now + t + dur + 0.05)
    })
  } catch (e) {
    console.warn('[Audio] No disponible:', e.message)
  }
}

// ─── Vibration API ────────────────────────────────────────────────────────────

/** Vibración larga para mesero: "tu plato está listo" */
export function vibrarMesero() {
  if ('vibrate' in navigator) {
    // Patrón: vibrando–pausa–vibrando–pausa–vibrando (urgente pero no molesto)
    navigator.vibrate([400, 100, 400, 100, 200])
  }
}

/** Vibración corta de confirmación */
export function vibrarCorto() {
  if ('vibrate' in navigator) navigator.vibrate(80)
}

// ─── Notifications API ────────────────────────────────────────────────────────

/** Solicita permiso para notificaciones del navegador */
export async function solicitarPermisoNotificaciones() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return await Notification.requestPermission()
}

/**
 * Muestra notificación push/toast al mesero
 * @param {string} serial - Ej: "K9X2"
 * @param {number} mesa   - Número de mesa
 */
export function notificarMeseroListo(serial, mesa) {
  const titulo  = `🍽️ Pedido #${serial} listo`
  const cuerpo  = `Mesa ${mesa} — lleva el plato ahora`
  const opciones = {
    body:               cuerpo,
    icon:               '/icon-192.png',
    badge:              '/icon-96.png',
    tag:                `comanda-${serial}`,
    renotify:           true,
    requireInteraction: true,          // Se queda hasta que el mesero la cierre
    vibrate:            [400, 100, 400],
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(titulo, opciones)
      n.onclick = () => { n.close(); window.focus() }
    } catch (e) {
      console.warn('[Notificaciones] Error:', e.message)
    }
  }
}

// ─── Flash visual ──────────────────────────────────────────────────────────

/**
 * Efecto de destello en pantalla (para cocina)
 * Añade/quita una clase CSS transitoria al body
 */
export function flashPantallaAlertaCocina() {
  document.body.classList.add('flash-alerta')
  setTimeout(() => document.body.classList.remove('flash-alerta'), 600)
}
