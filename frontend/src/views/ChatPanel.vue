<template>
  <!-- Chat Toggle Button -->
  <button class="chat-toggle" @click="isOpen = !isOpen" :class="{ 'chat-toggle--unread': unreadCount > 0 }">
    💬
    <span v-if="unreadCount > 0" class="chat-badge">{{ unreadCount }}</span>
  </button>

  <!-- Chat Panel also Chat Fenster -->
  <Transition name="chat-slide">
    <div v-if="isOpen" class="chat-panel">
      
      <!-- Header -->
      <div class="chat-header">
        <span class="chat-title">💬 Chat</span>
        <button class="chat-close" @click="isOpen = false">✕</button>
      </div>

      <!-- Nachrichten -->
      <div class="chat-messages" ref="messagesContainer">
        <div v-if="messages.length === 0" class="chat-empty">
          Noch keine Nachrichten…
        </div>
        <div
          v-for="(msg, i) in messages"
          :key="i"
          :class="['chat-message', { 'chat-message--me': msg.playerName === myName }]"
        >
          <span class="chat-message__name">{{ msg.playerName === myName ? 'Du' : msg.playerName }}</span>
          <span class="chat-message__text">{{ msg.text }}</span>
          <span class="chat-message__time">{{ formatTime(msg.timestamp) }}</span>
        </div>
      </div>

      <!-- Input -->
      <div class="chat-input-row">
        <input
          v-model="inputText"
          class="chat-input"
          type="text"
          placeholder="Nachricht schreiben…"
          maxlength="200"
          @keydown.enter="sendMessage"
        />
        <button class="chat-send" @click="sendMessage" :disabled="!inputText.trim()">
          ➤
        </button>
      </div>

    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { onWS, offWS, sendWS, connectWS } from '../services/wsClient.js'

const props = defineProps({
  roomCode: { type: String, required: true },
  myName:   { type: String, required: true },
})

const isOpen           = ref(false)
const inputText        = ref('')
const messages         = ref([])
const unreadCount      = ref(0)
const messagesContainer = ref(null)

// WS Nachrichten empfangen
onWS('chat', (msg) => {
  if (msg.type === 'CHAT_MESSAGE') {
    messages.value.push(msg.payload)
    if (!isOpen.value) {
      unreadCount.value++
    }
    scrollToBottom()
  }
})

// Unread zurücksetzen wenn Chat geöffnet wird
watch(isOpen, (open) => {
  if (open) {
    unreadCount.value = 0
    nextTick(() => scrollToBottom())
  }
})

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  
  const sent = sendWS({
    type: 'CHAT_MESSAGE',
    payload: {
      roomCode: props.roomCode,
      playerName: props.myName,
      text,
    }
  })
  
  // Falls WS nicht offen,dann reconnecten und nochmal
  if (!sent) {
    connectWS(props.roomCode, props.myName)
    setTimeout(() => {
      sendWS({
        type: 'CHAT_MESSAGE',
        payload: { roomCode: props.roomCode, playerName: props.myName, text }
      })
    }, 500)
  }
  
  inputText.value = ''
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

// Listener aufräumen
onUnmounted(() => {
  offWS('chat')
})
</script>