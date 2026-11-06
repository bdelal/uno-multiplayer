
<template>
  <button
    :class="[
      'uno-card',
      `uno-card--${card.color}`,
      {
        'uno-card--playable': playable && !disabled,
        'uno-card--disabled': !playable || disabled,
        'uno-card--small':    size === 'small',
        'uno-card--large':    size === 'large',
        'uno-card--facedown': facedown,
      }
    ]"
    :disabled="!playable || disabled"
    @click="handleClick"
    :aria-label="ariaLabel"
  >
    <template v-if="!facedown">
      <!-- Obere linke Ecke -->
      <span class="uno-card__corner uno-card__corner--tl">
        <span class="uno-card__corner-value">{{ displayValue }}</span>
        <span class="uno-card__corner-color" v-if="card.color !== 'wish'">{{ colorDot }}</span>
      </span>

      <!-- Mitte -->
      <span class="uno-card__center">
        <span class="uno-card__symbol">{{ centerSymbol }}</span>
      </span>

      <!-- Untere rechte Ecke (gespiegelt) -->
      <span class="uno-card__corner uno-card__corner--br">
        <span class="uno-card__corner-value">{{ displayValue }}</span>
        <span class="uno-card__corner-color" v-if="card.color !== 'wish'">{{ colorDot }}</span>
      </span>

      <!-- Wish-Karte: 4-Farben-Quadranten -->
      <div v-if="card.color === 'wish'" class="uno-card__wish-overlay">
        <div class="wish-quadrant wish-quadrant--red"></div>
        <div class="wish-quadrant wish-quadrant--blue"></div>
        <div class="wish-quadrant wish-quadrant--yellow"></div>
        <div class="wish-quadrant wish-quadrant--green"></div>
        <span class="wish-label">{{ card.value === 'wish+4' ? '+4' : '★' }}</span>
      </div>
    </template>

    <!-- Rückseite (Gegner-Karten) -->
    <template v-else>
      <div class="uno-card__back">
        <span class="uno-card__back-label">UNO</span>
      </div>
    </template>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // { color: 'red'|'green'|'blue'|'yellow'|'wish', value: '0'-'9'|'skip'|'reverse'|'+2'|'wish'|'wish+4' }
  card: {
    type: Object,
    required: true,
  },
  // Ergebnis von isCardPlayable() aus cardLogic.js
  playable: {
    type: Boolean,
    default: false,
  },
  // Allgemein deaktiviert (nicht eigener Zug)
  disabled: {
    type: Boolean,
    default: false,
  },
  // 'small' | 'normal' | 'large'
  size: {
    type: String,
    default: 'normal',
  },
  // Karte verdeckt zeigen (für Gegner-Karten)
  facedown: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['play'])

// ── Anzeige-Logik ──────────────────────────────────────────────
const valueMap = {
  'skip':   '🚫',
  'reverse': '↺',
  '+2':     '+2',
  'wish':   '★',
  'wish+4': '+4',
}

const colorDotMap = {
  red:    '🔴',
  green:  '🟢',
  blue:   '🔵',
  yellow: '🟡',
}

const displayValue = computed(() => {
  if (props.card.color === 'wish') return props.card.value === 'wish+4' ? '+4' : '★'
  return valueMap[props.card.value] ?? props.card.value
})

const centerSymbol = computed(() => {
  if (props.card.color === 'wish') return ''
  return valueMap[props.card.value] ?? props.card.value
})

const colorDot = computed(() => colorDotMap[props.card.color] ?? '')

const ariaLabel = computed(() => {
  if (props.facedown) return 'Verdeckte Karte'
  const colorNames = { red: 'Rot', green: 'Grün', blue: 'Blau', yellow: 'Gelb', wish: 'Wunsch' }
  return `${colorNames[props.card.color] ?? props.card.color} ${props.card.value}`
})

function handleClick() {
  if (props.playable && !props.disabled) {
    emit('play', props.card)
  }
}
</script>