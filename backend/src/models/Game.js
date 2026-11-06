import mongoose from 'mongoose'

// ─────────────────────────────────────────
// Karten-Schema
// ─────────────────────────────────────────
const cardSchema = new mongoose.Schema({
  color: {
    type: String,
    enum: ['red', 'green', 'blue', 'yellow', 'wish'],
  },
  value: {
    type: String,
    // Normale Karten:   '0'-'9', 'skip', 'reverse', '+2'
    // Wild-Karten:      'wish', 'wish+4'
    // Sonderkarten: 'revive', 'swap'
  },
});

// ─────────────────────────────────────────
// Spieler-Schema
// ─────────────────────────────────────────
const playerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },

  // seine Karten auf der Hand (eine Liste von Karten)
  handCards: [cardSchema], 

  // ob noch online
  isConnected: { type: Boolean, default: true },

  // Falls der Spieler gewonnen hat aber wiederbeleb wurde
  isRevived: { type: Boolean, default: false },

  // Speichert wann der Spieler ursprünglich gewonnen hat
  finishedAt: { type: Date, default: null },
});

// ─────────────────────────────────────────
// Spiel-Schema
// ─────────────────────────────────────────
const gameSchema = new mongoose.Schema(
  {
    //Code zum Beitreten
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    status: {
      type: String,
      enum: ['waiting', 'running', 'finished'],
      default: 'waiting',
    },
    // alle Spieler die mitspielen
    players: [playerSchema],

    //maximale Anzahl der Spieler
    maxPlayers: {
      type: Number,
      default: 4,
      min: 2,
      max: 4,
    },

    // Spieler die schon gewonnen hatten (Reihenfolge 1., 2., 3. ...)
    // aber wiederbelebt werden könnten
    finishedPlayers: [playerSchema],

    // wer gerade dran ist
    currentPlayerIndex: {
      type: Number,
      default: 0,
    },

    // 1 = normal, -1 = rückwärts
    direction: {
      type: Number,
      enum: [1, -1],
      default: 1,
    },

     // die Karte die gerade oben auf dem Stapel liegt
    topCard: cardSchema,

    // alle Karten die noch gezogen werden können
    drawPile: [cardSchema],

    // Für Wunschkarte & Wiederbelebung:
    // Speichert die gewünschte Farbe bis die nächste Karte gespielt wird
    wishedColor: {
      type: String,
      enum: ['red', 'green', 'blue', 'yellow'],
      default: null,
    },

    // Speichert ob gerade eine Wiederbelebung aktiv ist
    pendingRevive: {
      type: Boolean,
      default: false,
    },

    winner: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Game', gameSchema);
