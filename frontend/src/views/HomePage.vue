<template>
  <div class="home">

    <!-- Hintergrund -->
    <div class="home__bg">
      <div class="home__bg-glow"></div>
      <div id="home-stars"></div>
    </div>

    <main class="home__main">
      <!-- Logo -->
      <div class="hero">
        <div class="uno-badge">UNO!</div>
        <p class="hero__sub">Multiplayer Kartenspiel – bis zu 4 Spieler</p>
      </div>

      <!-- Card -->
      <div class="home-card">
        <div class="tabs" role="tablist">
          <button role="tab" :aria-selected="mode === 'create'"
            :class="['tab', { active: mode === 'create' }]" @click="mode = 'create'">
            Spiel erstellen
          </button>
          <button role="tab" :aria-selected="mode === 'join'"
            :class="['tab', { active: mode === 'join' }]" @click="mode = 'join'">
            Spiel beitreten
          </button>
        </div>

        <!-- Erstellen -->
        <div v-if="mode === 'create'" class="form-section">
          <label class="field-label" for="create-name">Dein Name</label>
          <input id="create-name" v-model="playerName" class="input" type="text"
            placeholder="z. B. Berhan" maxlength="20" :readonly="!!currentUser" />

          <label class="field-label" for="max-players">Max. Spieleranzahl</label>
          <div class="player-count-row">
            <button v-for="n in [2, 3, 4]" :key="n"
              :class="['count-btn', { active: maxPlayers === n }]" @click="maxPlayers = n">
              {{ n }}
            </button>
          </div>

          <button class="btn btn--primary" :disabled="!playerName.trim() || loading" @click="handleCreate">
            <span v-if="loading">⏳ Erstelle…</span>
            <span v-else>Lobby erstellen →</span>
          </button>
        </div>

        <!-- Beitreten -->
        <div v-if="mode === 'join'" class="form-section">
          <label class="field-label" for="join-name">Dein Name</label>
          <input id="join-name" v-model="playerName" class="input" type="text"
            placeholder="z. B. Delal" maxlength="20" :readonly="!!currentUser" />

          <label class="field-label" for="room-code">Raum-Code</label>
          <input id="room-code" v-model="roomCode" class="input input--code" type="text"
            placeholder="z. B. AB12CD" maxlength="6" @input="roomCode = roomCode.toUpperCase()" />

          <button class="btn btn--secondary"
            :disabled="!playerName.trim() || roomCode.length < 6 || loading" @click="handleJoin">
            <span v-if="loading">⏳ Trete bei…</span>
            <span v-else>Lobby beitreten →</span>
          </button>
        </div>

        <p v-if="error" class="error-msg" role="alert">⚠️ {{ error }}</p>
      </div>
        <div v-if="isAdmin" class="admin-banner">
  <router-link to="/admin" class="admin-link">
      Admin-Bereich: {{ userCount !== null ? userCount + " Benutzer" : "..." }}
  </router-link>
</div>
<!-- Passkey einrichten, nur sichtbar für eingeloggte Nutzer -->
      <div v-if="currentUser" class="home-card" style="margin-top: 1rem;">
        <div class="form-section">
          <button class="btn btn--secondary" :disabled="passkeyLoading" @click="handleRegisterPasskey">
            <span v-if="passkeyLoading">Wird eingerichtet…</span>
            <span v-else>Passkey einrichten</span>
          </button>
          <p v-if="passkeyMessage" class="error-msg" role="status">{{ passkeyMessage }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createLobby, joinLobby, getAllUsers, registerPasskey } from '../services/unoapi.service.js'

const router = useRouter()
const mode = ref('create')
const playerName = ref('')
const roomCode = ref('')
const maxPlayers = ref(4)
const loading = ref(false)
const error = ref('')
const currentUser = ref(null)

async function handleCreate() {
  error.value = ''
  loading.value = true
  const name = currentUser.value?.username?.trim() || playerName.value.trim()
  try {
    const lobby = await createLobby(name, maxPlayers.value)
    router.push({ name: 'lobby', params: { roomCode: lobby.roomCode }, query: { playerName: name } })
  } catch (e) {
    error.value = e.message
    localStorage.setItem('uno-playername', name)
  } finally {
    loading.value = false
  }
}

async function handleJoin() {
  error.value = ''
  loading.value = true
  try {
    const name = currentUser.value?.username?.trim() || playerName.value.trim()
    const lobby = await joinLobby(roomCode.value, name)
    router.push({ name: 'lobby', params: { roomCode: lobby.roomCode }, query: { playerName: name } })
  } catch (e) {
    error.value = e.message
    localStorage.setItem('uno-playername', playerName.value.trim())
  } finally {
    loading.value = false
  }
}

// eingeloggten User aus sessionStorage lesen
const userCount = ref(null)
// wenn der eingeloggte User die Rolle "admin" hat
const isAdmin = computed(() => currentUser.value?.role === 'admin')

// lädt die Nutzerzahl 
async function loadUserCount() {
  try {
    const users = await getAllUsers()
    userCount.value = users.length
  } catch (e) {
    console.error('Nutzerzahl konnte nicht geladen werden:', e)
  }
}
onMounted(() => {
  // Gespeicherten Spielernamen laden
  const stored = sessionStorage.getItem('user')
  if (stored) {
    currentUser.value = JSON.parse(stored)
  }

  const saved = localStorage.getItem('uno-playername')
  if (saved) playerName.value = saved

  if (currentUser.value?.username) {
    playerName.value = currentUser.value.username
  }
  if (currentUser.value?.role === 'admin') {
    loadUserCount()
  }
  const container = document.getElementById('home-stars')
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

// Zustand für das Passkey-Einrichten
const passkeyLoading = ref(false)
const passkeyMessage = ref('')

// Holt den aktuellen Login-Token aus sessionStorage und startet den
// Registrierungs-Ablauf (Challenge holen -> Browser fragt nach PIN-> Ergebnis an den Server schicken).
async function handleRegisterPasskey() {
  passkeyMessage.value = ''
  passkeyLoading.value = true
  try {
    const token = sessionStorage.getItem('token')
    await registerPasskey(token)
    passkeyMessage.value = '✅ Passkey erfolgreich eingerichtet!'
  } catch (e) {
    passkeyMessage.value = e.message
  } finally {
    passkeyLoading.value = false
  }
}
</script>