/**
 * Lobby Routes
 * 
 * Endpunkte für Lobby-Management:
 * - POST /lobby/create - Neue Lobby erstellen
 * - POST /lobby/join/:roomCode - Lobby beitreten
 */

import express from 'express'
import { createLobby, joinLobby } from '../controllers/lobbyController.js'

const router = express.Router()

router.post('/create', createLobby)
router.post('/join/:roomCode', joinLobby)

export default router