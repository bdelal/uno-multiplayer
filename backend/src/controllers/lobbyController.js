/**
 * Lobby Controller
 * 
 * Handling von HTTP Requests für Lobby-Endpunkte
 * Ruft Services auf, gibt Responses zurück
 * 
 * ARCHITEKTUR:
 * HTTP Request -> Controller -> Service -> Repository -> Database
 */

import { gameService } from '../services/GameService.js'
import {
  validateCreateLobby,
  validateJoinLobby,
  validateRoomCode
} from '../validators/inputValidator.js'
import { pubsub } from '../graphql/pubsub.js';

/**
 * POST /lobby/create
 * Erstellt neue Lobby
 */
export const createLobby = async (req, res, next) => {
  try {
    const { playerName, maxPlayers } = req.body

    // Input Validierung
    validateCreateLobby({ playerName, maxPlayers })

    // Service aufrufen
    const result = await gameService.createLobby(playerName, maxPlayers)

    res.status(201).json(result)
  } catch (error) {
    next(error) // Error Handler kümmert sich
  }
}

/**
 * POST /lobby/join/:roomCode
 * Spieler betritt Lobby
 */
export const joinLobby = async (req, res, next) => {
  try {
    const { playerName } = req.body
    const { roomCode } = req.params

    // Input Validierung
    validateJoinLobby({ playerName })
    validateRoomCode(roomCode)

    // Service aufrufen
    const game = await gameService.joinLobby(roomCode, playerName)

    pubsub.publish('GAME_UPDATED', { gameUpdated: game }); 
    res.status(200).json({
      roomCode: game.roomCode,
      players: game.players.map(p => ({ username: p.username }))
    })
  } catch (error) {
    next(error)
  }
}