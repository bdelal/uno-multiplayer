
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/server.js'

let mongoServer

// Erstellt vor allen Tests eine temporäre Testdatenbank.
beforeAll(async () => {
  await mongoose.disconnect()
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  await mongoose.connect(uri)
}, 30000)

// Löscht nach jedem Test alle Daten,
// damit jeder Test mit einer leeren Datenbank startet.
afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
}, 30000)

// Schließt die Datenbank nach allen Tests.
afterAll(async () => {
  await mongoose.connection.close()
  await mongoServer.stop()
}, 30000)


// Prüft, ob eine Lobby erfolgreich erstellt wird.
describe('POST /lobby/create', () => {
  it('sollte eine Lobby erstellen und roomCode zurückgeben', async () => {
    const response = await request(app)
      .post('/lobby/create')
      .send({ playerName: 'Berhan', maxPlayers: 4 })

    expect(response.status).toBe(201)
    expect(response.body.roomCode).toBeDefined()
    expect(response.body.roomCode).toHaveLength(6)
  })

  it('sollte den Ersteller als ersten Spieler speichern', async () => {
    const response = await request(app)
      .post('/lobby/create')
      .send({ playerName: 'Berhan', maxPlayers: 4 })

    expect(response.status).toBe(201)
    expect(response.body.game.players).toHaveLength(1)
    expect(response.body.game.players[0].username).toBe('Berhan')
  })

  it('sollte maxPlayers korrekt speichern', async () => {
    const response = await request(app)
      .post('/lobby/create')
      .send({ playerName: 'Berhan', maxPlayers: 3 })

    expect(response.status).toBe(201)
    expect(response.body.game.maxPlayers).toBe(3)
  })

  it('sollte Status "waiting" haben', async () => {
    const response = await request(app)
      .post('/lobby/create')
      .send({ playerName: 'Berhan', maxPlayers: 4 })

    expect(response.status).toBe(201)
    expect(response.body.game.status).toBe('waiting')
  })

  it('sollte 400 zurückgeben wenn playerName leer ist', async () => {
    const response = await request(app)
      .post('/lobby/create')
      .send({ playerName: '', maxPlayers: 4 })

    expect(response.status).toBe(400)
  })

  it('sollte 400 zurückgeben wenn playerName fehlt', async () => {
    const response = await request(app)
      .post('/lobby/create')
      .send({ maxPlayers: 4 })

    expect(response.status).toBe(400)
  })

  it('sollte 400 zurückgeben wenn maxPlayers zu klein ist (1)', async () => {
    const response = await request(app)
      .post('/lobby/create')
      .send({ playerName: 'Berhan', maxPlayers: 1 })

    expect(response.status).toBe(400)
  })

  it('sollte 400 zurückgeben wenn maxPlayers zu groß ist (5)', async () => {
    const response = await request(app)
      .post('/lobby/create')
      .send({ playerName: 'Berhan', maxPlayers: 5 })

    expect(response.status).toBe(400)
  })

  it('sollte 400 zurückgeben wenn maxPlayers fehlt', async () => {
    const response = await request(app)
      .post('/lobby/create')
      .send({ playerName: 'Berhan' })

    expect(response.status).toBe(400)
  })

  it('sollte jeden Mal einen anderen roomCode generieren', async () => {
    const res1 = await request(app)
      .post('/lobby/create')
      .send({ playerName: 'Berhan', maxPlayers: 4 })

    const res2 = await request(app)
      .post('/lobby/create')
      .send({ playerName: 'Delal', maxPlayers: 4 })

    expect(res1.body.roomCode).not.toBe(res2.body.roomCode)
  })
})


//  Testet das Beitreten einer Lobby.
describe('POST /lobby/join/:roomCode', () => {
  const createLobby = async (playerName = 'Berhan', maxPlayers = 4) => {
    const res = await request(app)
      .post('/lobby/create')
      .send({ playerName, maxPlayers })
    return res.body.roomCode
  }

  it('sollte Spieler zur Lobby hinzufügen', async () => {
    const roomCode = await createLobby()

    const joinRes = await request(app)
      .post(`/lobby/join/${roomCode}`)
      .send({ playerName: 'Delal' })

    expect(joinRes.status).toBe(200)
    expect(joinRes.body.players).toHaveLength(2)
  })

  it('sollte den neuen Spieler in der Spielerliste haben', async () => {
    const roomCode = await createLobby()

    const joinRes = await request(app)
      .post(`/lobby/join/${roomCode}`)
      .send({ playerName: 'Delal' })

    const usernames = joinRes.body.players.map(p => p.username)
    expect(usernames).toContain('Delal')
  })

  it('sollte 404 zurückgeben wenn Lobby nicht existiert', async () => {
    const response = await request(app)
      .post('/lobby/join/FALSCH')
      .send({ playerName: 'Berhan' })
     // Beitritt zu einer nicht vorhandenen Lobby.
    expect(response.status).toBe(404)
  })

  it('sollte 400 zurückgeben wenn playerName leer ist', async () => {
    const roomCode = await createLobby()

    const response = await request(app)
      .post(`/lobby/join/${roomCode}`)
      .send({ playerName: '' })
      // Ungültiger Spielername.
    expect(response.status).toBe(400)
  })

  it('sollte ablehnen, wenn die Lobby bereits voll ist', async () => {
  const roomCode = await createLobby('Berhan', 2)
  await request(app)
    .post(`/lobby/join/${roomCode}`)
    .send({ playerName: 'Delal' })

  // Zweiter Beitritt sollte abgelehnt werden, da die Lobby bereits voll ist
  const response = await request(app)
    .post(`/lobby/join/${roomCode}`)
    .send({ playerName: 'Souman' })

  expect(response.status).toBe(400)
  expect(response.body.error).toBeDefined()
})

  it('sollte mehrere Spieler bis maxPlayers erlauben', async () => {
    const roomCode = await createLobby('Spieler1', 4)

    await request(app).post(`/lobby/join/${roomCode}`).send({ playerName: 'Spieler2' })
    await request(app).post(`/lobby/join/${roomCode}`).send({ playerName: 'Spieler3' })
    const lastJoin = await request(app).post(`/lobby/join/${roomCode}`).send({ playerName: 'Spieler4' })

    expect(lastJoin.status).toBe(200)
    expect(lastJoin.body.players).toHaveLength(4)
  })
})
