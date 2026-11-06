import { GameService } from '../../../src/services/GameService.js'
import { connect, closeDatabase, clearDatabase } from '../../setup.js'
import {
  ValidationError,
  GameError
} from '../../../src/errors/AppError.js'

let gameService

// Baut vor allen Tests die Verbindung zur Testdatenbank auf
beforeAll(async () => {
  await connect()
}, 30000)

// Erstellt vor jedem Test eine neue Instanz
beforeEach(() => {
  gameService = new GameService()
})

// Löscht nach jedem Test alle Daten
afterEach(async () => {
  await clearDatabase()
}, 30000)

// Schließt die Testdatenbank
afterAll(async () => {
  await closeDatabase()
}, 30000)

describe('GameService', () => {

  describe('createLobby', () => {
    // Testet das Erstellen einer neuen Lobby.
    it('sollte eine neue Lobby erstellen', async () => {

      const result = await gameService.createLobby(
        'Berhan',
        4
      )
        // Prüft die erzeugten Lobbydaten.
      expect(result.roomCode).toBeDefined()
      expect(result.roomCode).toHaveLength(6)

      expect(result.game).toBeDefined()
      expect(result.game.players).toHaveLength(1)
      expect(result.game.players[0].username).toBe('Berhan')
      expect(result.game.maxPlayers).toBe(4)
      expect(result.game.status).toBe('waiting')

    })

    it('sollte ValidationError werfen wenn playerName leer ist', async () => {

      await expect(
        gameService.createLobby('', 4)
      ).rejects.toThrow(ValidationError)

    })

    it('sollte ValidationError werfen wenn playerName nur Leerzeichen enthält', async () => {

      await expect(
        gameService.createLobby('   ', 4)
      ).rejects.toThrow(ValidationError)

    })

    it('sollte ValidationError werfen wenn maxPlayers kleiner als 2 ist', async () => {

      await expect(
        gameService.createLobby('Berhan', 1)
      ).rejects.toThrow(ValidationError)

    })

    it('sollte ValidationError werfen wenn maxPlayers größer als 4 ist', async () => {

      await expect(
        gameService.createLobby('Berhan', 5)
      ).rejects.toThrow(ValidationError)

    })

  })

// Testet das Beitreten einer Lobby.
  describe('joinLobby', () => {

  it('sollte einen Spieler zur Lobby hinzufügen', async () => {

    const lobby = await gameService.createLobby(
      'Berhan',
      4
    )

    const game = await gameService.joinLobby(
      lobby.roomCode,
      'Delal'
    )

    expect(game.players).toHaveLength(2)
    expect(game.players[1].username).toBe('Delal')

  })

  it('sollte ValidationError werfen wenn playerName leer ist', async () => {

    const lobby = await gameService.createLobby(
      'Berhan',
      4
    )

    await expect(
      gameService.joinLobby(lobby.roomCode, '')
    ).rejects.toThrow(ValidationError)

  })

  it('sollte ValidationError werfen wenn playerName nur Leerzeichen enthält', async () => {

    const lobby = await gameService.createLobby(
      'Berhan',
      4
    )

    await expect(
      gameService.joinLobby(lobby.roomCode, '   ')
    ).rejects.toThrow(ValidationError)

  })

  })

// Testet den Spielstart.
  describe('startGame', () => {

  it('sollte ein Spiel starten', async () => {

    const lobby = await gameService.createLobby(
      'Berhan',
      2
    )

    await gameService.joinLobby(
      lobby.roomCode,
      'Delal'
    )

    const game = await gameService.startGame(
      lobby.roomCode
    )

    expect(game.status).toBe('running')
    expect(game.currentPlayerIndex).toBe(0)

    expect(game.players).toHaveLength(2)

    expect(game.players[0].handCards).toHaveLength(7)
    expect(game.players[1].handCards).toHaveLength(7)

    expect(game.topCard).toBeDefined()
    expect(game.drawPile.length).toBeGreaterThan(0)

  })
  it('sollte GameError werfen wenn weniger als 2 Spieler in der Lobby sind', async () => {

  const lobby = await gameService.createLobby(
    'Berhan',
    2
  )

  await expect(
    gameService.startGame(lobby.roomCode)
  ).rejects.toThrow(GameError)

})

})

// Testet das Abrufen eines Spiels.
describe('getGameState', () => {

  it('sollte den aktuellen Spielzustand zurückgeben', async () => {

    const lobby = await gameService.createLobby(
      'Berhan',
      4
    )
    // Ruft den aktuellen Spielzustand ab.
    const game = await gameService.getGameState(
      lobby.roomCode
    )
    // Prüft die zurückgegebenen Spieldaten.
  expect(game).toBeDefined()
    expect(game).toBeDefined()
    expect(game.roomCode).toBe(lobby.roomCode)
    expect(game.players).toHaveLength(1)
    expect(game.players[0].username).toBe('Berhan')

  })

})

// Prüft, ob eine Karte gespielt werden darf
describe('isValidMove', () => {

  it('sollte true zurückgeben wenn die Karte spielbar ist', () => {

    const topCard = {
      color: 'red',
      value: '5'
    }

    const card = {
      color: 'red',
      value: '8'
    }
      // Karte hat dieselbe Farbe und ist daher spielbar.
    expect(
      gameService.isValidMove(card, topCard, null)
    ).toBe(true)

  })

  it('sollte false zurückgeben wenn die Karte nicht spielbar ist', () => {

    const topCard = {
      color: 'red',
      value: '5'
    }

    const card = {
      color: 'blue',
      value: '8'
    }
    // Karte passt weder nach Farbe noch nach Wert.
    expect(
      gameService.isValidMove(card, topCard, null)
    ).toBe(false)

  })

})

// Prüft, welcher Spieler aktuell an der Reihe ist.
describe('isPlayerTurn', () => {

  it('sollte true zurückgeben wenn der Spieler an der Reihe ist', async () => {

    const lobby = await gameService.createLobby(
      'Berhan',
      2
    )

    // Zweiter Spieler tritt der Lobby bei.
    await gameService.joinLobby(
      lobby.roomCode,
      'Delal'
    )

    // Startet das Spiel.
    await gameService.startGame(
      lobby.roomCode
    )

    // Prüft, ob Berhan aktuell an der Reihe ist.
    const result = await gameService.isPlayerTurn(
      lobby.roomCode,
      'Berhan'
    )

    expect(result).toBe(true)

  })

  it('sollte false zurückgeben wenn der Spieler nicht an der Reihe ist', async () => {

    const lobby = await gameService.createLobby(
      'Berhan',
      2
    )

    await gameService.joinLobby(
      lobby.roomCode,
      'Delal'
    )

    await gameService.startGame(
      lobby.roomCode
    )

    // Prüft, ob Delal zu Beginn noch nicht an der Reihe ist.
    const result = await gameService.isPlayerTurn(
      lobby.roomCode,
      'Delal'
    )

    expect(result).toBe(false)

  })

})

})