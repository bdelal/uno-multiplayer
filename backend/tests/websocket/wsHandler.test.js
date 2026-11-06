import { jest } from '@jest/globals'
import { handleConnection } from '../../src/websocket/wsHandler.js'
import Game from '../../src/models/Game.js'

jest.spyOn(Game, 'findOne')

describe('WebSocket', () => {

//Registriert die WebSocket-Events.
  describe('handleConnection', () => {

    it('sollte die Events "message" und "close" registrieren', () => {

      const ws = {
        on: jest.fn()
      }

      handleConnection(ws)

      
      // Prüft, ob beide Events registriert wurden.
      expect(ws.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )

      expect(ws.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function)
      )

    })

  })

  // Prüft, ob bei einem unbekannten Spiel eine ERROR-Nachricht gesendet wird
  describe('START_GAME', () => {

    it('sollte einen Fehler senden wenn das Spiel nicht existiert', async () => {

    // Simuliert, dass kein Spiel gefunden wird.
      Game.findOne.mockResolvedValue(null)

      const ws = {
        on: jest.fn(),
        send: jest.fn()
      }

      handleConnection(ws)

      const messageHandler =
        ws.on.mock.calls.find(call => call[0] === 'message')[1]

     // Simuliert eine START_GAME-Nachricht.
      await messageHandler(
        JSON.stringify({
          type: 'START_GAME',
          payload: {
            roomCode: 'ABC123'
          }
        })
      )

      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'ERROR',
          payload: 'Spiel nicht gefunden'
        })
      )

    })

  })

// Prüft, ob bei einem unbekannten Spiel eine ERROR-Nachricht gesendet wird.
describe('PLAY_CARD', () => {

  it('sollte einen Fehler senden wenn das Spiel nicht existiert', async () => {
// Simuliert, dass kein Spiel gefunden wird.
    Game.findOne.mockResolvedValue(null)

    const ws = {
      on: jest.fn(),
      send: jest.fn()
    }

    handleConnection(ws)

    const messageHandler =
      ws.on.mock.calls.find(call => call[0] === 'message')[1]

//eine PLAY_CARD-Nachricht.
    await messageHandler(
      JSON.stringify({
        type: 'PLAY_CARD',
        payload: {
          roomCode: 'ABC123',
          playerName: 'Berhan',
          card: {
            color: 'red',
            value: '5'
          }
        }
      })
    )

    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'ERROR',
        payload: 'Spiel nicht gefunden'
      })
    )

  })

})

// Prüft, ob bei einem unbekannten Spiel eine ERROR-Nachricht gesendet wird.
describe('DRAW_CARD', () => {

  it('sollte einen Fehler senden wenn das Spiel nicht existiert', async () => {

    Game.findOne.mockResolvedValue(null)

    const ws = {
      on: jest.fn(),
      send: jest.fn()
    }

    handleConnection(ws)

    const messageHandler =
      ws.on.mock.calls.find(call => call[0] === 'message')[1]

//eine DRAW_CARD-Nachricht.
    await messageHandler(
      JSON.stringify({
        type: 'DRAW_CARD',
        payload: {
          roomCode: 'ABC123',
          playerName: 'Berhan'
        }
      })
    )

    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'ERROR',
        payload: 'Spiel nicht gefunden'
      })
    )

  })

})

// Prüft, ob eine JOIN_LOBBY-Nachricht ohne Fehler verarbeitet wird.
describe('JOIN_LOBBY', () => {

  it('sollte eine JOIN_LOBBY-Nachricht verarbeiten', async () => {

    Game.findOne.mockResolvedValue({
      players: [
        {
          username: 'Berhan'
        }
      ]
    })

    const ws = {
      on: jest.fn(),
      send: jest.fn()
    }

    handleConnection(ws)

    const messageHandler =
      ws.on.mock.calls.find(call => call[0] === 'message')[1]

    await messageHandler(
      JSON.stringify({
        type: 'JOIN_LOBBY',
        payload: {
          roomCode: 'ABC123',
          playerName: 'Delal'
        }
      })
    )

    expect(ws.send).not.toHaveBeenCalledWith(
      JSON.stringify({
        type: 'ERROR',
        payload: 'Spiel nicht gefunden'
      })
    )

  })

})

})