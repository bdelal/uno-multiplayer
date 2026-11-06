// backend/src/validators/inputValidator.js
import { ValidationError } from '../errors/AppError.js'

/**
 * Validiert Eingaben für Lobby-Erstellung
 */
export const validateCreateLobby = (data) => {
  const { playerName, maxPlayers } = data

  if (!playerName || typeof playerName !== 'string') {
    throw new ValidationError('Spielername erforderlich und muss ein String sein')
  }

  if (playerName.trim().length === 0) {
    throw new ValidationError('Spielername darf nicht leer sein')
  }

  if (playerName.length > 20) {
    throw new ValidationError('Spielername darf max 20 Zeichen lang sein')
  }

  if (!maxPlayers || typeof maxPlayers !== 'number') {
    throw new ValidationError('maxPlayers erforderlich und muss eine Zahl sein')
  }

  if (maxPlayers < 2 || maxPlayers > 4) {
    throw new ValidationError('maxPlayers muss zwischen 2 und 4 sein')
  }
}

/**
 * Validiert Eingaben für Lobby-Beitritt
 */
export const validateJoinLobby = (data) => {
  const { playerName } = data

  if (!playerName || typeof playerName !== 'string') {
    throw new ValidationError('Spielername erforderlich')
  }

  if (playerName.trim().length === 0) {
    throw new ValidationError('Spielername darf nicht leer sein')
  }

  if (playerName.length > 20) {
    throw new ValidationError('Spielername darf max 20 Zeichen lang sein')
  }
}

/**
 * Validiert Room Code Format
 */
export const validateRoomCode = (roomCode) => {
  if (!roomCode || typeof roomCode !== 'string') {
    throw new ValidationError('Room Code erforderlich')
  }

  if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
    throw new ValidationError('Ungültiger Room Code Format')
  }
}

/**
 * Validiert Spielzug-Daten
 */
export const validatePlayCardInput = (data) => {
  const { roomCode, playerName, card } = data

  validateRoomCode(roomCode)

  if (!playerName || typeof playerName !== 'string') {
    throw new ValidationError('Spielername erforderlich')
  }

  if (!card || typeof card !== 'object') {
    throw new ValidationError('Kartendaten erforderlich')
  }

  const { color, value } = card
  if (!color || !value) {
    throw new ValidationError('Karte muss color und value haben')
  }
}
