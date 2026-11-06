// backend/src/services/GameService.js
/**
 * GameService
 * 
 * Enthält die BUSINESS LOGIC für Spiele
 * - Spiellogik (Validierungen, Regeln)
 * - Koordination zwischen Game und Repository
 * 
 * ARCHITEKTUR:
 * Controller -> Service -> Repository -> Database
 */

import { gameRepository } from '../repositories/GameRepository.js'
import {
  createDeck,
  shuffleDeck,
  giveCards,
  isCardPlayable,
  getNextIndex,
  drawCards
} from '../game/cardLogic.js'
import { GameError, ValidationError } from '../errors/AppError.js'
import { v4 as uuidv4 } from 'uuid'

export class GameService {
  /**
   * Erstellt neue Lobby
   * @param {string} playerName - Ersteller der Lobby
   * @param {number} maxPlayers - Max Spieler (2-4)
   * @returns {Promise<{roomCode, game}>}
   */
  async createLobby(playerName, maxPlayers) {
    // Falls maxPlayers undefined ist dann Default auf 4 setzen
    const validatedMaxPlayers = (maxPlayers && maxPlayers >= 2 && maxPlayers <= 4) ? maxPlayers : 4;
    // Validierung in Service (Business Logic)
    if (!playerName || playerName.trim().length === 0) {
      throw new ValidationError('Spielername erforderlich')
    }

    if (maxPlayers < 2 || maxPlayers > 4) {
      throw new ValidationError('maxPlayers muss zwischen 2 und 4 sein')
    }

    // Generiere eindeutigen Room Code
    const roomCode = uuidv4().substring(0, 6).toUpperCase()

    // Erstelle Spiel über Repository
    const game = await gameRepository.createGame(
      roomCode,
      [{ username: playerName, isConnected: true }],
      maxPlayers
    )

    return {
      roomCode: game.roomCode,
      game
    }
  }

  /**
   * Spieler betritt Lobby
   * @param {string} roomCode
   * @param {string} playerName
   * @returns {Promise<Game>}
   */
  async joinLobby(roomCode, playerName) {
    // Validierung
    if (!playerName || playerName.trim().length === 0) {
      throw new ValidationError('Spielername erforderlich')
    }

    // Spieler hinzufügen (Repository kümmert sich um Validierung)
    const game = await gameRepository.addPlayer(roomCode, playerName)

    return game
  }

  /**
   * Startet das Spiel
   * @param {string} roomCode
   * @returns {Promise<Game>}
   */
  async startGame(roomCode) {
    const game = await gameRepository.findByRoomCodeOrFail(roomCode)

    // Validierungen
    if (game.status !== 'waiting') {
      throw new GameError('Spiel läuft bereits oder ist beendet')
    }

    if (game.players.length < 2) {
      throw new GameError('Mindestens 2 Spieler erforderlich')
    }

    // Deck erstellen und verteilen
    const deck = shuffleDeck(createDeck())
    const { hands, deck: remainingDeck } = giveCards(deck, game.players.length)

    // Karten zu Spielern zuweisen
    game.players.forEach((player, index) => {
      player.handCards = hands[index]
    })

    // Erste Karte auf Tisch legen (darf keine Wunschkarte sein)
    let topCard
    do {
      topCard = remainingDeck.pop()
    } while (topCard.color === 'wish')

    game.topCard = topCard
    game.drawPile = remainingDeck
    game.status = 'running'
    game.currentPlayerIndex = 0

    // Speichere über Repository
    await gameRepository.updateGame(roomCode, {
      status: 'running',
      players: game.players,
      topCard: game.topCard,
      drawPile: game.drawPile,
      currentPlayerIndex: 0
    })

    return game
  }

  /**
   * Spiel Zustand abrufen
   * @param {string} roomCode
   * @returns {Promise<Game>}
   */
  async getGameState(roomCode) {
    return await gameRepository.findByRoomCodeOrFail(roomCode)
  }

  /**
   * Validiert ob Karte spielbar ist
   * @param {object} card - Zu spielende Karte
   * @param {object} topCard - Aktuelle obere Karte
   * @param {string} wishedColor - Gewünschte Farbe von Wunschkarte
   * @returns {boolean}
   */
  isValidMove(card, topCard, wishedColor) {
    return isCardPlayable(card, topCard, wishedColor)
  }

  /**
   * Validiert ob Spieler an der Reihe ist
   * @param {string} roomCode
   * @param {string} playerName
   * @returns {Promise<boolean>}
   */
  async isPlayerTurn(roomCode, playerName) {
    const game = await gameRepository.findByRoomCodeOrFail(roomCode)
    const currentPlayer = game.players[game.currentPlayerIndex]
    return currentPlayer.username === playerName
  }
}

// Singleton Instance
export const gameService = new GameService()
