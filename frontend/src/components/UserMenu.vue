<template>
  <div class="user-menu-wrapper" ref="menuRef">
    <button class="user-toggle" type="button" @click="toggleMenu" aria-label="Benutzermenü öffnen">
      <span v-if="avatarUrl" class="header-avatar" :style="avatarStyle" aria-hidden="true"></span>
      <svg v-else viewBox="0 0 24 24" class="menu-icon" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <div v-if="open" class="user-popup">
      <template v-if="user">
        <div class="avatar-section">
          <div class="avatar-preview" :style="avatarStyle">
            <span v-if="!avatarUrl">{{ initials }}</span>
          </div>
          <label class="avatar-label">
            <input type="file" accept="image/*" @change="onFileSelect" />
            Bild wählen
          </label>
        </div>
        <button class="admin-btn" v-if="isAdmin" type="button" @click="goAdmin">Admin-Bereich</button>
        <button class="logout-btn" type="button" @click="logout">Abmelden</button>
      </template>
      <template v-else>
        <div class="no-user-message">Nicht angemeldet.</div>
        <button class="login-btn" type="button" @click="router.push('/login')">Zum Login</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const user = ref(null)
const avatarUrl = ref(null)
const open = ref(false)
const menuRef = ref(null)

const initials = computed(() => {
  if (!user.value?.username) return ''
  return user.value.username
    .split(' ')
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2)
})

function storageKey(username) {
  return `uno-avatar-${username}`
}

function loadUser() {
  const stored = sessionStorage.getItem('user')
  if (!stored) return

  const parsed = JSON.parse(stored)
  if (parsed.username) {
    const storedAvatar = localStorage.getItem(storageKey(parsed.username))
    if (storedAvatar) parsed.avatar = storedAvatar
  }

  user.value = parsed
  avatarUrl.value = parsed.avatar || null
}

function saveUser(data) {
  sessionStorage.setItem('user', JSON.stringify(data))
}

function logout() {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
  router.push('/login')
}

function onFileSelect(event) {
  const file = event.target.files?.[0]
  if (!file || !user.value?.username) return

  const reader = new FileReader()
  reader.onload = () => {
    const url = reader.result
    avatarUrl.value = url
    user.value.avatar = url
    saveUser(user.value)
    localStorage.setItem(storageKey(user.value.username), url)
    window.dispatchEvent(new CustomEvent('uno-avatar-updated', {
      detail: { username: user.value.username, avatarUrl: url }
    }))
  }
  reader.readAsDataURL(file)
}

const isAdmin = computed(() => user.value?.role === 'admin')

function goAdmin() {
  router.push('/admin')
}

const avatarStyle = computed(() => {
  if (avatarUrl.value) {
    return {
      backgroundImage: `url(${avatarUrl.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return { backgroundColor: '#6d5dfc' }
})

function toggleMenu() {
  open.value = !open.value
}

function handleClickOutside(event) {
  if (!menuRef.value) return
  if (!menuRef.value.contains(event.target)) {
    open.value = false
  }
}

onMounted(() => {
  loadUser()
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.user-menu-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.user-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  cursor: pointer;
  overflow: hidden;
}

.header-avatar {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  background-size: cover;
  background-position: center;
}

.user-popup {
  position: absolute;
  right: 0;
  top: calc(100% + 0.6rem);
  width: min(260px, 100vw - 1rem);
  background: rgba(12, 8, 45, 0.98);
  border: 1px solid rgba(150, 120, 255, 0.26);
  border-radius: 18px;
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28);
  padding: 0.95rem;
  backdrop-filter: blur(16px);
  z-index: 30;
}

.avatar-section {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.avatar-preview {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 18px;
  background: #5a47d1;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 1.25rem;
  overflow: hidden;
}

.avatar-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.65rem 0.9rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  cursor: pointer;
  color: #f0f0f0;
  font-weight: 700;
}

.avatar-label input {
  display: none;
}

.admin-btn,
.logout-btn {
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 0.8rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.admin-btn {
  background: #1d7ed8;
  color: #fff;
  margin-bottom: 0.5rem;
}

.logout-btn {
  background: #e63946;
  color: #fff;
}

.admin-btn:hover,
.logout-btn:hover,
.login-btn:hover {
  opacity: 0.94;
}

.no-user-message {
  color: rgba(255, 255, 255, 0.8);
  padding: 0.75rem 0.5rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 0.95rem;
  text-align: center;
  margin-bottom: 0.75rem;
}

.login-btn {
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 0.8rem 1rem;
  background: #1d7ed8;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.login-btn:hover {
  opacity: 0.94;
}
</style>