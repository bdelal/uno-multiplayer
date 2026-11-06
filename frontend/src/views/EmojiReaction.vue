<template>
  <div>
    <!-- Emoji Buttons unten neben den Karten -->
    <div class="emoji-buttons">
      <button 
        v-for="emoji in emojis" 
        :key="emoji"
        class="emoji-btn"
        @click="sendEmoji(emoji)"
      >
        {{ emoji }}
      </button>
    </div>

    <!-- Floating Emojis die über das Spielfeld fliegen -->
    <Teleport to="body">
      <div class="emoji-float-container">
        <div
          v-for="reaction in reactions"
          :key="reaction.id"
          class="emoji-float"
          :style="{ left: reaction.x + '%' }"
        >
          <span class="float-emoji">{{ reaction.emoji }}</span>
          <span class="float-name">{{ reaction.playerName }}</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { onWS, offWS, sendWS } from '../services/wsClient.js'

const props = defineProps({
  roomCode: String,
  myName: String
})

const emojis = ['😂', '🔥', '😤', '👏', '😱', '💀', '🎉', '😎']
const reactions = ref([])

function sendEmoji(emoji) {
  sendWS({
    type: 'SEND_EMOJI',
    payload: {
      roomCode: props.roomCode,
      playerName: props.myName,
      emoji
    }
  })
}

onMounted(() => {
  onWS('emoji', (msg) => {
    if (msg.type === 'EMOJI_RECEIVED') {
      const reaction = {
        id: Date.now() + Math.random(),
        playerName: msg.payload.playerName,
        emoji: msg.payload.emoji,
        x: Math.random() * 70 + 10 // zufällige horizontale Position
      }
      reactions.value.push(reaction)
      setTimeout(() => {
        reactions.value = reactions.value.filter(r => r.id !== reaction.id)
      }, 2500)
    }
  })
})

onUnmounted(() => {
  offWS('emoji')
})
</script>

<style scoped>
.emoji-buttons {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.emoji-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 1.3rem;
  cursor: pointer;
  transition: transform 0.1s;
}

.emoji-btn:hover {
  transform: scale(1.2);
  background: rgba(255,255,255,0.2);
}

.emoji-float-container {
  position: fixed;
  bottom: 150px;
  left: 0;
  width: 100%;
  pointer-events: none;
  z-index: 9999;
}

.emoji-float {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: floatUp 2.5s ease-out forwards;
}

.float-emoji {
  font-size: 2.5rem;
}

.float-name {
  font-size: 0.65rem;
  color: rgba(255,255,255,0.7);
  background: rgba(0,0,0,0.3);
  padding: 2px 6px;
  border-radius: 6px;
}

@keyframes floatUp {
  0%   { transform: translateY(0) scale(0.5); opacity: 0; }
  20%  { transform: translateY(-30px) scale(1.2); opacity: 1; }
  80%  { transform: translateY(-150px) scale(1); opacity: 1; }
  100% { transform: translateY(-250px) scale(0.8); opacity: 0; }
}
</style>