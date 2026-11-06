import { gameRepository } from '../../../src/repositories/GameRepository.js'
import { connect, closeDatabase, clearDatabase } from '../../setup.js'
import {
  NotFoundError,
  ValidationError
} from '../../../src/errors/AppError.js'

beforeAll(async () => {
  await connect()
}, 30000)

afterEach(async () => {
  await clearDatabase()
}, 30000)

afterAll(async () => {
  await closeDatabase()
}, 30000)

describe('GameRepository', () => {

  describe('createGame', () => {
    // Testet das Erstellen eines neuen Spiels.
    it('sollte ein neues Spiel erstellen', async () => {
      const game = await gameRepository.createGame(
        'ABC123',
        [{ username: 'Berhan' }],
        4
      )

      // Prüft die erzeugten Spieldaten.
      expect(game.roomCode).toBe('ABC123')
      expect(game.players).toHaveLength(1)
      expect(game.players[0].username).toBe('Berhan')
      expect(game.maxPlayers).toBe(4)
      expect(game.status).toBe('waiting')
    })

  })

  // Testet das Suchen eines Spiels.
  describe('findByRoomCode', () => {

    it('sollte ein Spiel anhand des RoomCodes finden', async () => {
      await gameRepository.createGame(
        'ABC123',
        [{ username: 'Berhan' }],
        4
      )

      const game = await gameRepository.findByRoomCode('ABC123')

      // Prüft, ob das richtige Spiel gefunden wurde.
      expect(game).not.toBeNull()
      expect(game.roomCode).toBe('ABC123')
    })

    it('sollte null zurückgeben wenn Spiel nicht existiert', async () => {
      const game = await gameRepository.findByRoomCode('FALSCH')

      // Es wird kein Spiel erwartet.
      expect(game).toBeNull()
    })

  })

// Testet das Suchen eines Spiel mit Fehlerbehandlung.
  describe('findByRoomCodeOrFail', () => {

  it('sollte das Spiel zurückgeben', async () => {
    await gameRepository.createGame(
      'ABC123',
      [{ username: 'Berhan' }],
      4
    )

    const game = await gameRepository.findByRoomCodeOrFail('ABC123')

    expect(game.roomCode).toBe('ABC123')
  })

  it('sollte NotFoundError werfen wenn Spiel nicht existiert', async () => {
    await expect(
      gameRepository.findByRoomCodeOrFail('FALSCH')
    ).rejects.toThrow(NotFoundError)
  })

  })

// Testet das Hinzufügen eines Spielers.
describe('addPlayer', () => {

  it('sollte einen Spieler hinzufügen', async () => {
    await gameRepository.createGame(
      'ABC123',
      [{ username: 'Berhan' }],
      4
    )

    const game = await gameRepository.addPlayer(
      'ABC123',
      'Delal'
    )

    // Prüft die aktualisierte Spielerliste.
    expect(game.players).toHaveLength(2)
    expect(game.players[1].username).toBe('Delal')
  })

it('sollte denselben Spieler nicht doppelt hinzufügen', async () => {

  await gameRepository.createGame(
    'ABC123',
    [{ username: 'Berhan' }],
    4
  )

  const game = await gameRepository.addPlayer(
    'ABC123',
    'Berhan'
  )

  expect(game.players).toHaveLength(1)
  expect(game.players[0].username).toBe('Berhan')

})

})  

// Testet das Aktualisieren eines Spiels.
  describe('updateGame', () => {

  it('sollte den Status aktualisieren', async () => {

    await gameRepository.createGame(
      'ABC123',
      [{ username: 'Berhan' }],
      4
    )
    // Aktualisiert den Spielstatus.
    const game = await gameRepository.updateGame(
      'ABC123',
      {
        status: 'running'
      }
    )
    // Prüft den neuen Status.
    expect(game.status).toBe('running')
  })

  })

// Testet das Finden laufender Spiele.
  describe('findAllRunning', () => {

  it('sollte alle laufenden Spiele finden', async () => {

    await gameRepository.createGame(
      'RUN001',
      [{ username: 'A' }],
      4
    )
    // Setzt den Status auf "running".
    await gameRepository.updateGame(
      'RUN001',
      {
        status: 'running'
      }
    )

    // Sucht alle laufenden Spiele.
    const games = await gameRepository.findAllRunning()

    // Prüft die gefundenen Spiele.
    expect(games).toHaveLength(1)
    expect(games[0].roomCode).toBe('RUN001')
    expect(games[0].status).toBe('running')
  })

  })

  // Testet das Finden beendeter Spiele.
  describe('findAllFinished', () => {

  it('sollte alle beendeten Spiele finden', async () => {

    await gameRepository.createGame(
      'FIN001',
      [{ username: 'A' }],
      4
    )

    // Setzt den Status auf "finished".
    await gameRepository.updateGame(
      'FIN001',
      {
        status: 'finished'
      }
    )
    // Sucht alle beendeten Spiele.
    const games = await gameRepository.findAllFinished()

    // Prüft die gefundenen Spiele.
    expect(games).toHaveLength(1)
    expect(games[0].roomCode).toBe('FIN001')
    expect(games[0].status).toBe('finished')
  })

  })

  // Testet das Löschen eines Spiels.
  describe('deleteGame', () => {

  it('sollte ein Spiel löschen', async () => {

    await gameRepository.createGame(
      'DEL001',
      [{ username: 'Berhan' }],
      4
    )

    // Löscht das Spiel.
    const deleted = await gameRepository.deleteGame('DEL001')

    expect(deleted).toBe(true)

    const game = await gameRepository.findByRoomCode('DEL001')

    expect(game).toBeNull()
  })

  })
})