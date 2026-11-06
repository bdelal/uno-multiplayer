<template>
  <div class="game">
    <div class="game__bg">
      <div class="game__bg-glow"></div>
      <div id="game-stars"></div>
    </div>

    <header class="game__header">
      <div class="game__uno-logo">UNO!</div>
      <div class="header-center">
        <span class="turn-indicator" :class="{ 'my-turn': isMyTurn }">
          {{ isMyTurn ? '🟢 Dein Zug!' : `⏳ ${currentPlayerName} ist dran` }}
        </span>
        <span class="direction-badge">{{ direction === 1 ? '→ Uhrzeigersinn' : '← Gegen Uhrzeigersinn' }}</span>
      </div>
      <div class="room-info">
        <span class="room-label">Raum</span>
        <span class="room-code">{{ roomCode }}</span>
      </div>
    </header>

    <div class="game__table">
      <div class="table__top">
        <div v-for="player in topPlayers" :key="player.username"
          :class="['pbox', { 'pbox--active': currentPlayerName === player.username }]">
          <div class="pbox__avatar" :style="getPlayerAvatarStyle(player)">
            <img v-if="getAvatarUrl(player.username)" :src="getAvatarUrl(player.username)" alt="Avatar" class="player-avatar-img" />
            <span v-else>{{ player.username[0].toUpperCase() }}</span>
          </div>
          <div class="pbox__name">{{ player.username }}</div>
          <div class="pbox__cards-row">
            <div v-for="n in Math.min(player.cardCount ?? 0, 7)" :key="n" class="mini-card"></div>
          </div>
          <div class="pbox__count">🃏 {{ player.cardCount ?? 0 }} Karten</div>
          <span class="uno-alert" v-if="player.cardCount === 1">UNO!</span>
        </div>
      </div>

      <div class="table__left">
        <div v-for="player in leftPlayers" :key="player.username"
          :class="['pbox pbox--side', { 'pbox--active': currentPlayerName === player.username }]">
          <div class="pbox__avatar" :style="getPlayerAvatarStyle(player)">
            <img v-if="getAvatarUrl(player.username)" :src="getAvatarUrl(player.username)" alt="Avatar" class="player-avatar-img" />
            <span v-else>{{ player.username[0].toUpperCase() }}</span>
          </div>
          <div>
            <div class="pbox__name">{{ player.username }}</div>
            <div class="pbox__cards-col">
              <div v-for="n in Math.min(player.cardCount ?? 0, 6)" :key="n" class="mini-card-h"></div>
            </div>
            <div class="pbox__count">🃏 {{ player.cardCount ?? 0 }}</div>
          </div>
          <span class="uno-alert" v-if="player.cardCount === 1">UNO!</span>
        </div>
      </div>

      <div class="table__center">
        <div class="pile-area">
          <div class="pile-label">Ablage</div>
          <Card v-if="topCard" :card="topCard" :playable="false" :disabled="true" size="large"/>
          <div v-else class="top-card--empty">?</div>
          <div v-if="wishedColor" class="wished-badge">{{ colorIcons[wishedColor] }}</div>
        </div>
        <div class="center-logo">UNO!</div>
        <div class="draw-pile-area">
          <div class="pile-label">Ziehen</div>
          <button class="draw-pile" :disabled="!isMyTurn || loading" @click="drawCard">
            <span class="draw-pile__icon">🂠</span>
            <span class="draw-pile__label">Ziehen</span>
          </button>
        </div>
      </div>

      <div class="table__right">
        <div v-for="player in rightPlayers" :key="player.username"
          :class="['pbox pbox--side', { 'pbox--active': currentPlayerName === player.username }]">
          <div>
            <div class="pbox__name">{{ player.username }}</div>
            <div class="pbox__cards-col">
              <div v-for="n in Math.min(player.cardCount ?? 0, 6)" :key="n" class="mini-card-h"></div>
            </div>
            <div class="pbox__count">🃏 {{ player.cardCount ?? 0 }}</div>
          </div>
          <div class="pbox__avatar" :style="getPlayerAvatarStyle(player)">
            <img v-if="getAvatarUrl(player.username)" :src="getAvatarUrl(player.username)" alt="Avatar" class="player-avatar-img" />
            <span v-else>{{ player.username[0].toUpperCase() }}</span>
          </div>
          <span class="uno-alert" v-if="player.cardCount === 1">UNO!</span>
        </div>
      </div>
    </div>

    <div v-if="showColorPicker" class="color-picker-overlay">
      <div class="color-picker">
        <h3 class="color-picker-title">Farbe wählen</h3>
        <div class="color-options">
          <button v-for="color in ['red','green','blue','yellow']" :key="color"
            class="color-btn" :class="`color-btn--${color}`" @click="chooseColor(color)">
            {{ colorIcons[color] }}
          </button>
        </div>
      </div>
    </div>

    <footer class="game__hand">
      <EmojiReaction :roomCode="roomCode" :myName="myName" />
      <div class="hand-label">
        <span class="hand-me">{{ myName }}</span>
        <span class="hand-count">{{ myCards.length }} Karten</span>
        <span class="uno-self-alert" v-if="myCards.length === 1">UNO! 🔥</span>
      </div>
      <div class="hand-cards">
        <Card v-for="(card, i) in myCards" :key="i" :card="card"
          :playable="isPlayable(card) && isMyTurn"
          :disabled="!isMyTurn || !isPlayable(card) || loading"
          @play="() => playCard(card, i)" />
      </div>
    </footer>

    <div v-if="winner" class="winner-overlay">
      <div class="winner-box">
        <div class="winner-trophy">🏆</div>
        <h2 class="winner-title">{{ winner === myName ? 'Du hast gewonnen!' : `${winner} hat gewonnen!` }}</h2>
        <p class="winner-sub">{{ winner === myName ? 'Glückwunsch! 🎉' : 'Besser nächstes Mal!' }}</p>
        <button class="winner-btn" @click="goHome">Zurück zur Startseite</button>
      </div>
    </div>

    <div v-if="error" class="error-toast" @click="error = ''">⚠️ {{ error }}</div>
   
    <!-- Chat Fenster-->
    <ChatPanel :roomCode="roomCode" :myName="myName" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '../views/Card.vue'
import ChatPanel from '../views/ChatPanel.vue'
import { connectWS, onWS, offWS, sendWS, isWSOpen } from '../services/wsClient.js'
import EmojiReaction from '../views/EmojiReaction.vue'
import { authHeaders } from '../services/auth.js'


const route  = useRoute()
const router = useRouter()

const roomCode = route.params.roomCode
const myName   = route.query.playerName || ''

const players            = ref([])
const myCards            = ref([])
const topCard            = ref(null)
const direction          = ref(1)
const currentPlayerIndex = ref(0)
const wishedColor        = ref(null)
const winner             = ref(null)
const loading            = ref(false)
const error              = ref('')
const showColorPicker    = ref(false)
const pendingCard        = ref(null)
const pendingCardIndex   = ref(null)

const opponents         = computed(() => players.value.filter(p => p.username !== myName))
const currentPlayerName = computed(() => players.value[currentPlayerIndex.value]?.username ?? '')
const isMyTurn          = computed(() => currentPlayerName.value === myName)

const topPlayers   = computed(() => opponents.value.filter((_, i) => i % 3 === 0))
const leftPlayers  = computed(() => opponents.value.filter((_, i) => i % 3 === 1))
const rightPlayers = computed(() => opponents.value.filter((_, i) => i % 3 === 2))

const avatarColorList = ['#1d7ed8', '#f4a01c', '#e63946', '#2a9d3f']
function avatarColor(player) {
  const idx = opponents.value.findIndex(p => p.username === player.username)
  return avatarColorList[idx % 4]
}

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

watch(players, refreshAvatars, { immediate: true })

function getAvatarUrl(username) {
  const player = players.value.find((p) => p.username === username)
  if (player?.avatar) return player.avatar
  try {
    return localStorage.getItem(`uno-avatar-${username}`)
  } catch {
    return null
  }
}

function getPlayerAvatarStyle(player) {
  const avatar = player.avatar || getAvatarUrl(player.username)
  if (avatar) {
    return {
      backgroundImage: `url("${avatar}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  }
  return { background: avatarColor(player) }
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

const colorIcons = { red: '🔴', green: '🟢', blue: '🔵', yellow: '🟡' }

function isPlayable(card) {
  if (!topCard.value) return true
  if (card.color === 'wish') return true
  const activeColor = wishedColor.value ?? topCard.value.color
  return card.color === activeColor || card.value === topCard.value.value
}
//Token Objekt immer im Header siehe services/auth.js
async function fetchGameState() {
  try {
    const res = await fetch('http://localhost:3000/graphql', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        query: `query { getGame(roomCode: "${roomCode}") {
          status currentPlayerIndex direction wishedColor winner
          topCard { color value }
          players { username isConnected handCards { color value } }
        }}`
      })
    })
    const data = await res.json()
    const game = data?.data?.getGame
    if (!game) return
    players.value            = game.players.map(p => ({
      username: p.username,
      isConnected: p.isConnected,
      cardCount: p.handCards?.length ?? 0,
      avatar: (() => {
        try {
          return localStorage.getItem(`uno-avatar-${p.username}`)
        } catch {
          return null
        }
      })(),
    }))
    refreshAvatars()
    topCard.value            = game.topCard
    direction.value          = game.direction ?? 1
    currentPlayerIndex.value = game.currentPlayerIndex ?? 0
    wishedColor.value        = game.wishedColor ?? null
    winner.value             = game.winner ?? null
    const me = game.players.find(p => p.username === myName)
    if (me) myCards.value = me.handCards ?? []
  } catch (e) {
    console.error('fetchGameState Fehler:', e)
  }
}

function playCard(card, index) {
  if (!isMyTurn.value || !isPlayable(card) || loading.value) return
  if (card.color === 'wish') {
    pendingCard.value = card; pendingCardIndex.value = index; showColorPicker.value = true; return
  }
  submitPlayCard(card, index, null)
}

function chooseColor(color) {
  showColorPicker.value = false
  submitPlayCard(pendingCard.value, pendingCardIndex.value, color)
  pendingCard.value = null; pendingCardIndex.value = null
}

function submitPlayCard(card, index, wishedColorChoice) {
  loading.value = true
  const sent = sendWS({
    type: 'PLAY_CARD',
    payload: { roomCode, playerName: myName, card, wishedColor: wishedColorChoice }
  })
  if (!sent) {
    // WS nicht offen neu verbinden und nochmal
    connectWS(roomCode, myName)
    setTimeout(() => {
      sendWS({ type: 'PLAY_CARD', payload: { roomCode, playerName: myName, card, wishedColor: wishedColorChoice } })
    }, 500)
  }
  loading.value = false
}

function drawCard() {
  if (!isMyTurn.value || loading.value) return
  const sent = sendWS({
    type: 'DRAW_CARD',
    payload: { roomCode, playerName: myName }
  })
  if (!sent) {
    connectWS(roomCode, myName)
    setTimeout(() => {
      sendWS({ type: 'DRAW_CARD', payload: { roomCode, playerName: myName } })
    }, 500)
  }
}

function goHome() { router.push({ name: 'home' }) }

onMounted(() => {
  window.addEventListener('uno-avatar-updated', handleAvatarUpdated)
  window.addEventListener('storage', handleStorageChange)

  // WS sicherstellen (wird von LobbyView evtl. schon geöffnet)
  connectWS(roomCode, myName)

  // Auf Game-Events hören
  onWS('game', (msg) => {
    if (msg.type === 'CARD_PLAYED' || msg.type === 'CARD_DRAWN' || msg.type === 'GAME_STARTED') {
      const p = msg.payload
      if (p.players)                          players.value = p.players
      if (p.topCard)                          topCard.value = p.topCard
      if (p.currentPlayerIndex !== undefined) currentPlayerIndex.value = p.currentPlayerIndex
      if (p.wishedColor !== undefined)        wishedColor.value = p.wishedColor
      if (p.winner)                           winner.value = p.winner
    }
    if (msg.type === 'YOUR_CARDS') {
      myCards.value = msg.payload.handCards ?? []
    }
    if (msg.type === 'ERROR') {
      error.value = msg.payload
      setTimeout(() => error.value = '', 3000)
    }
  })

  fetchGameState()

  //Design funktion: Nur für die Sterne da
  const container = document.getElementById('game-stars')
  if (container) {
    for (let i = 0; i < 140; i++) {
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
  offWS('game')
})
</script>