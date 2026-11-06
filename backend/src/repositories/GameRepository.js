// backend/src/repositories/GameRepository.js
/**
 * GameRepository
 * 
 * DAO (Data Access Object) Pattern für Game Modell
 * Alle Datenbankzugriffe laufen über diese Klasse
 * 
 * ZWECK: Trennung von Business Logic und Datenzugriff
 * Wenn die DB später zu PostgreSQL wechselt, nur diese Datei ändern
 */

import Game from '../models/Game.js'
import { NotFoundError, ValidationError } from '../errors/AppError.js'
import { pubsub } from '../graphql/pubsub.js';

export class GameRepository {
  /**
   * Erstellt ein neues Spiel
   * @param {string} roomCode - Eindeutiger Code für das Spiel
   * @param {array} players - Array von Spielern
   * @param {number} maxPlayers - Maximale Anzahl Spieler
   * @returns {Promise<Game>}
   */
  async createGame(roomCode, players, maxPlayers) {
    const game = new Game({
      roomCode,
      players,
      maxPlayers,
      status: 'waiting'
    })
    await game.save()
    return game
  }

  /**
   * Findet Spiel nach Room Code
   * @param {string} roomCode
   * @returns {Promise<Game|null>}
   */
  async findByRoomCode(roomCode) {
    return await Game.findOne({ roomCode })
  }

  /**
   * Findet Spiel und throws NotFoundError wenn nicht existiert
   * @param {string} roomCode
   * @returns {Promise<Game>}
   */
  async findByRoomCodeOrFail(roomCode) {
    const game = await this.findByRoomCode(roomCode)
    if (!game) {
      throw new NotFoundError(`Spiel mit Code "${roomCode}" nicht gefunden`)
    }
    return game
  }

  /**
   * Fügt Spieler zu Spiel hinzu
   * @param {string} roomCode
   * @param {string} playerName
   * @returns {Promise<Game>} Das aktualisierte Spiel-Dokument
 * @throws {NotFoundError} Wenn keine Lobby mit dem roomCode existiert
 * @throws {ValidationError} Wenn das Spiel bereits läuft oder die Lobby voll ist
 */
  async addPlayer(roomCode, playerName) {
    const game = await this.findByRoomCodeOrFail(roomCode)

    // Refresh-Schutz: schon drin -> einfach durchlassen
    if (game.players.some(p => p.username === playerName)) {
      return game
    }

    // Regel 1: Nur beitreten, solange gewartet wird
    if (game.status !== 'waiting') {
      throw new ValidationError('Spiel läuft bereits – Beitritt nicht möglich')
    }

    // Regel 2 + atomares Einfügen in EINER DB-Operation:
    // Nur pushen, wenn roomCode passt, status noch 'waiting' ist
    // UND weniger Spieler als maxPlayers da sind.
    const updated = await Game.findOneAndUpdate(
      {
        roomCode,
        status: 'waiting',
        $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] }
      },
      { $push: { players: { username: playerName } } },
      { returnDocument: 'after' }
    )

    // Kein Dokument zurück = Bedingung war falsch = Lobby war voll
    if (!updated) {
      throw new ValidationError('Lobby ist voll')
    }

    try {
      pubsub.publish('GAME_UPDATED', { gameUpdated: updated })
    } catch (e) {
      console.error('PubSub Fehler:', e)
    }

    return updated
  }

  /**
   * Speichert Spielzustand
   * @param {string} roomCode
   * @param {object} updates - Zu aktualisierende Felder
   * @returns {Promise<Game>}
   */
  async updateGame(roomCode, updates) {
    const game = await this.findByRoomCodeOrFail(roomCode)

    // Nur erlaubte Felder updaten
    const allowedUpdates = [
      'status',
      'players',
      'currentPlayerIndex',
      'direction',
      'topCard',
      'drawPile',
      'wishedColor',
      'finishedPlayers',
      'winner'
    ]

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        game[key] = updates[key]
      }
    })

    await game.save()
    return game
  }

  /**
   * Findet alle laufenden Spiele (für Stats/Admin)
   * @returns {Promise<array>}
   */
  async findAllRunning() {
    return await Game.find({ status: 'running' })
  }

  /**
   * Findet alle beendeten Spiele (für Stats)
   * @returns {Promise<array>}
   */
  async findAllFinished() {
    return await Game.find({ status: 'finished' })
  }

  /**
   * Löscht Spiel (z.B. bei Cleanup)
   * @param {string} roomCode
   * @returns {Promise<boolean>}
   */
  async deleteGame(roomCode) {
    const result = await Game.deleteOne({ roomCode })
    return result.deletedCount > 0
  }
}

// Singleton Instance
export const gameRepository = new GameRepository()
