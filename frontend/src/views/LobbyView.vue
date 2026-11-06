<template>
  <div class="lobby">
    <div class="lobby__bg">
      <div class="lobby__bg-glow"></div>
      <div id="lobby-stars"></div>
    </div>

    <header class="lobby__header">
      <div class="lobby__uno-logo">UNO!</div>
      <div class="room-info">
        <span class="room-label">Raum-Code</span>
        <button class="room-code" @click="copyCode" :title="copied ? 'Kopiert!' : 'Klicken zum Kopieren'">
          {{ roomCode }}<span class="copy-icon">{{ copied ? '✓' : '⎘' }}</span>
        </button>
      </div>
    </header>

    <main class="lobby__main">
      <section class="section">
        <h2 class="section-title">Spieler <span class="count-badge">{{ players.length }} / {{ maxPlayers }}</span></h2>
        <ul class="player-list">
          <li v-for="(player, i) in filledSlots" :key="i"
            :class="['player-slot', { filled: player, 'is-me': player?.username === myName }]">
            <div v-if="player" class="player-card">
              <div class="player-avatar" :style="getPlayerAvatarStyle(player, i)">
                <img v-if="getAvatarUrl(player.username)" :src="getAvatarUrl(player.username)" alt="Avatar" class="player-avatar-img" />
                <span v-else>{{ player.username[0].toUpperCase() }}</span>
              </div>
              <div class="player-info">
                <span class="player-name">{{ player.username }}</span>
                <span class="player-tag" v-if="i === 0">Ersteller</span>
                <span class="player-tag me" v-else-if="player.username === myName">Du</span>
              </div>
              <span class="online-dot" :class="{ connected: player.isConnected }"></span>
            </div>
            <div v-else class="player-empty">
              <span class="empty-icon">+</span>
              <span>Warte auf Spieler…</span>
            </div>
          </li>
        </ul>
      </section>

      <section class="section">
        <div class="status-box" :class="statusClass">
          <div class="status-indicator"></div>
          <p class="status-text">{{ statusText }}</p>
        </div>
        <button v-if="canStart" class="btn btn--start" @click="startGame" :disabled="starting">
          {{ starting ? '⏳ Starte…' : '🎮 Spiel starten' }}
        </button>
        <p v-if="error" class="error-msg" role="alert">⚠️ {{ error }}</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { connectWS, onWS, offWS } from '../services/wsClient.js'
import { authHeaders } from '../services/auth.js'

const route  = useRoute()
const router = useRouter()

const roomCode = route.params.roomCode
const myName   = route.query.playerName || ''

const players      = ref([])
const maxPlayers   = ref(4)
const status       = ref('waiting')
const error        = ref('')
const starting     = ref(false)
const copied       = ref(false)

const avatarColors = ['#e63946', '#1d7ed8', '#2a9d3f', '#f4a01c']

const filledSlots = computed(() => {
  const slots = [...players.value]
  while (slots.length < maxPlayers.value) slots.push(null)
  return slots
})

function refreshAvatars() {
  for (const player of players.value) {
    if (!player?.username) continue
    try {
      player.avatar = localStorage.getItem(`uno-avatar-${player.username}`)
    } catch {
      player.avatar = null
    }
  }
}

function getAvatarUrl(username) {
  const player = players.value.find((p) => p.username === username)
  if (player?.avatar) return player.avatar
  try {
    return localStorage.getItem(`uno-avatar-${username}`)
  } catch {
    return null
  }
}

function getPlayerAvatarStyle(player, index) {
  const avatar = player.avatar || getAvatarUrl(player.username)
  if (avatar) {
    return {
      backgroundImage: `url("${avatar}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  }
  return { background: avatarColors[index] }
}

function handleAvatarUpdated(event) {
  if (event?.detail?.username) {
    refreshAvatars()
  }
}

function handleStorageChange(event) {
  if (event.key?.startsWith('uno-avatar-')) {
    refreshAvatars()
  }
}

const canStart = computed(
  () => players.value[0]?.username === myName
     && players.value.length >= 2
     && status.value === 'waiting'
)

const statusText = computed(() => {
  if (status.value === 'running') return '🎮 Spiel läuft!'
  if (players.value.length < 2)   return '⏳ Warte auf mindestens einen weiteren Spieler…'
  if (players.value.length === maxPlayers.value) return '✅ Lobby voll – bereit zum Starten!'
  return `⏳ Warte auf Spieler (${players.value.length}/${maxPlayers.value})…`
})

const statusClass = computed(() => ({
  'status--ready':   players.value.length === maxPlayers.value && status.value === 'waiting',
  'status--running': status.value === 'running',
  'status--waiting': players.value.length < 2,
}))
//im header wird token als Objekt mitgeben als Sicherheitsmaßnahme siehe services/auth.js
async function fetchPlayers() {
  try {
    const res = await fetch('http://localhost:3000/graphql', {
      method: 'POST',
      headers:  authHeaders(),
      body: JSON.stringify({
        query: `query { getGame(roomCode: "${roomCode}") { 
          players { username isConnected } maxPlayers status 
        }}`
      })
    })
    const data = await res.json()
    const game = data?.data?.getGame
    if (game) {
      players.value    = (game.players ?? []).map((p) => ({
        username: p.username,
        isConnected: p.isConnected,
        avatar: (() => {
          try {
            return localStorage.getItem(`uno-avatar-${p.username}`)
          } catch {
            return null
          }
        })(),
      }))
      maxPlayers.value = game.maxPlayers ?? 4
      status.value     = game.status     ?? 'waiting'
      refreshAvatars()
      if (game.status === 'running') {
        router.push({ name: 'game', params: { roomCode }, query: { playerName: myName } })
      }
    }
  } catch (e) {
    console.error('fetchPlayers Fehler:', e)
  }
}

let pollInterval = null

async function startGame() {
  starting.value = true
  try {
    const res = await fetch('http://localhost:3000/graphql', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        query: `mutation StartGame($roomCode: String!) { startGame(roomCode: $roomCode) { status } }`,
        variables: { roomCode },
      }),
    })
    const data = await res.json()
    if (data.errors) throw new Error(data.errors[0].message)
    router.push({ name: 'game', params: { roomCode }, query: { playerName: myName } })
  } catch (e) {
    error.value = e.message
    starting.value = false
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(roomCode)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch (_) {}
}

onMounted(() => {
  window.addEventListener('uno-avatar-updated', handleAvatarUpdated)
  window.addEventListener('storage', handleStorageChange)

  // Singleton WS verbinden
  connectWS(roomCode, myName)

  // Auf Nachrichten hören
  onWS('lobby', (msg) => {
    if (msg.type === 'PLAYER_JOINED' || msg.type === 'PLAYER_LEFT') {
      fetchPlayers()
    }
    if (msg.type === 'GAME_STARTED') {
      router.push({ name: 'game', params: { roomCode }, query: { playerName: myName } })
    }
  })

  fetchPlayers()
  pollInterval = setInterval(fetchPlayers, 3000)

  // Design: Sterne
  const container = document.getElementById('lobby-stars')
  if (container) {
    for (let i = 0; i < 120; i++) {
      const s = document.createElement('div')
      s.className = 'game-star'
      const size = Math.random() * 2.5 + 0.3
      const glow = Math.random() > 0.75
      s.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;opacity:${Math.random()*0.7+0.2}${glow ? ';box-shadow:0 0 4px rgba(200,150,255,0.8)' : ''}`
      container.appendChild(s)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('uno-avatar-updated', handleAvatarUpdated)
  window.removeEventListener('storage', handleStorageChange)
  offWS('lobby')
  clearInterval(pollInterval)
  //WS NICHT schließen! wird von GameView weitergenutzt
})
</script>