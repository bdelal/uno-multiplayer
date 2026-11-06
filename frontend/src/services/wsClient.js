/*
 Globaler WebSocket-Singleton: nur EINE Verbindung für alle Views
 zuverlässige Verbindung

 Auto-Reconnect: speichert roomCode und playerName,
 verbindet sich automatisch neu, wenn die Verbindung abbricht.
 Maximal 5 Versuche, danach wird aufgehört um Endlos-Loops zu vermeiden.
*/

// Aktive WebSocket-Verbindung (nur eine gleichzeitig)
let ws = null

// Gespeicherte Verbindungsdaten für Auto-Reconnect
let _roomCode = null
let _playerName = null

// ReconnectZähler
let _retries = 0
const MAX_RETRIES = 5

// Alle registrierten Listener (key → handler)
// z.B. 'game' -> Game.vue Handler, 'chat' -> ChatPanel Handler
const listeners = new Map()

/**
 * Verbindet den WebSocket – falls bereits verbunden, nichts tun.
 * Speichert roomCode und playerName für Auto-Reconnect.
 */
export function connectWS(roomCode, playerName) {
  _roomCode = roomCode
  _playerName = playerName

  // Bereits verbunden? dann nichts tun
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('[WS] Bereits verbunden, nutze bestehende Verbindung')
    return
  }

  // Alte Verbindung sauber schließen bevor neue geöffnet wird
  // onclose auf null setzen verhindert dass der Reconnect-Loop ausgelöst wird
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
  // Token mitschicken
  ws = new WebSocket(`ws://localhost:3000/game?token=${sessionStorage.getItem('token')}`)

  ws.onopen = () => {
    // wenn erfolgreich verbunden, dann Zähler zurücksetzen
    _retries = 0
    console.log('[WS] Verbunden!')
    // Server mitteilen, wer wir sind und in welchem Raum
    ws.send(JSON.stringify({
      type: 'JOIN_LOBBY',
      payload: { roomCode, playerName }
    }))
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    // Nachricht an alle registrierten Listener weiterleiten
    // (Game.vue, ChatPanel.vue, LobbyView.vue hören hier)
    listeners.forEach((handler) => handler(msg))
  }

  ws.onerror = (e) => {
    console.error('[WS] Fehler:', e)
  }

  ws.onclose = () => {
    console.log('[WS] Verbindung geschlossen')
    ws = null

    // Auto-Reconnect: maximal MAX_RETRIES Versuche
    // Verhindert Endlos-Loop wenn Server wirklich down ist
    if (_roomCode && _playerName && _retries < MAX_RETRIES) {
      _retries++
      console.log(`[WS] Reconnecting... (${_retries}/${MAX_RETRIES})`)
      setTimeout(() => connectWS(_roomCode, _playerName), 1000)
    } else if (_retries >= MAX_RETRIES) {
      console.warn('[WS] Maximale Reconnect-Versuche erreicht. Verbindung aufgegeben.')
    }
  }
}

/**
 * Trennt die WebSocket-Verbindung manuell und löscht alle Listener.
 * Wird z.B. beim Verlassen des Spiels aufgerufen.
 */
export function disconnectWS() {
  if (ws) {
    ws.onclose = null // Verhindert Auto-Reconnect beim manuellen Trennen
    ws.close()
    ws = null
  }
  listeners.clear()
}

/**
 * Sendet eine Nachricht über den WebSocket.
 * Gibt true zurück wenn erfolgreich, false wenn nicht verbunden.
 */
export function sendWS(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
    return true
  }
  console.warn('[WS] Nicht verbunden, Nachricht nicht gesendet:', message.type)
  return false
}

//Registriert einen Listener für eingehende WS-Nachrichten
export function onWS(key, handler) {
  listeners.set(key, handler)
}

/**
 * Entfernt einen Listener, wichtig in game,lobby, chatpannel views onUnmounted() aufrufen
 * damit keine verwaisten Handler übrig bleiben.
 */
export function offWS(key) {
  listeners.delete(key)
}



export function isWSOpen() {
  return ws && ws.readyState === WebSocket.OPEN
}