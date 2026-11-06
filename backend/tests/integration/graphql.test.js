import request from 'supertest'
import app from '../../src/server.js'
import { connect, closeDatabase, clearDatabase } from '../setup.js'
import { resolvers } from '../../src/graphql/resolvers.js'
import { jest } from '@jest/globals'

jest.setTimeout(30000)

beforeAll(async () => {
  await connect()
})

afterEach(async () => {
  await clearDatabase()
})

afterAll(async () => {
  await closeDatabase()
})

describe('GraphQL', () => {

  // NEU: token außerhalb von beforeAll deklarieren, damit er in allen Tests sichtbar ist
  let token;

  beforeAll(async () => {
    // NEU: erst einen echten Test-User registrieren, da die DB frisch/leer ist
    await request(app)
      .post('/auth/register')
      .send({
        username: 'graphqltester',
        email: 'graphqltester@test.de',
        password: 'test1234'
      })

    // Test-User einloggen, um an ein gültiges Token zu kommen
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'graphqltester@test.de', password: 'test1234' })

    token = loginRes.body.token
  })

  // MUTATIONS
  //Testet GraphQL-Mutations, die Datenerstellen oder verändern.
  describe('createGame', () => {

    it('sollte ein neues Spiel erstellen', async () => {
      // Sendet eine GraphQL-Mutation zum Erstellen eines Spiels.
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${token}`) // NEU
        .send({
          query: `
            mutation {
              createGame(
                playerName: "Berhan"
                maxPlayers: 4
              ) {
                roomCode
                status
                maxPlayers
                players {
                  username
                }
              }
            }
          `
        })

    // Prüft, ob die Mutation erfolgreich war und die erwarteten Daten zurückgeben wurden
      expect(response.status).toBe(200)
      expect(response.body.errors).toBeUndefined()

      // Prüft, ob die zurückgegebene Daten korrekt ist
      expect(response.body.data.createGame.status).toBe('waiting')
      expect(response.body.data.createGame.maxPlayers).toBe(4)
      expect(response.body.data.createGame.players).toHaveLength(1)
      expect(
        response.body.data.createGame.players[0].username
      ).toBe('Berhan')
      // RoomCodes bestehen aus 6 Zeichen.
      expect(
        response.body.data.createGame.roomCode
      ).toHaveLength(6)

    })

  })


  // QUERIES
  // Testet GraphQL-Queries, die Datenauslesen.
  describe('getGame', () => {

    it('sollte ein Spiel über getGame zurückgeben', async () => {
        // Erstellt ein Spiel für den Query-Test.
      const createResponse = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${token}`) // NEU
        .send({
          query: `
            mutation {
              createGame(
                playerName: "Berhan"
                maxPlayers: 4
              ) {
                roomCode
              }
            }
          `
        })

      const roomCode =
        createResponse.body.data.createGame.roomCode

    // Fragt das Spiel über GraphQL ab.
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${token}`) // NEU
        .send({
          query: `
            query {
              getGame(roomCode: "${roomCode}") {
                roomCode
                status
                maxPlayers
                players {
                  username
                }
              }
            }
          `
        })
    
    // Prüft, ob die gespeicherten Daten korrekt zurückgegeben werden.
      expect(response.status).toBe(200)
      expect(response.body.errors).toBeUndefined()

      expect(response.body.data.getGame.roomCode)
        .toBe(roomCode)

      expect(response.body.data.getGame.status)
        .toBe('waiting')

      expect(response.body.data.getGame.maxPlayers)
        .toBe(4)

      expect(response.body.data.getGame.players)
        .toHaveLength(1)

      expect(response.body.data.getGame.players[0].username)
        .toBe('Berhan')

    })

  })
  describe('joinGame', () => {

  it('sollte einen zweiten Spieler zur Lobby hinzufügen', async () => {

    // Erstellt zunächst eine Lobby.
    const createResponse = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`) // NEU
      .send({
        query: `
          mutation {
            createGame(
              playerName: "Berhan"
              maxPlayers: 4
            ) {
              roomCode
            }
          }
        `
      })

    const roomCode =
      createResponse.body.data.createGame.roomCode

    // Zweiter Spieler tritt bei
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`) // NEU
      .send({
        query: `
          mutation {
            joinGame(
              roomCode: "${roomCode}"
              playerName: "Delal"
            ) {
              roomCode
              players {
                username
              }
            }
          }
        `
      })

    expect(response.status).toBe(200)
    expect(response.body.errors).toBeUndefined()

    expect(response.body.data.joinGame.roomCode)
      .toBe(roomCode)

    expect(response.body.data.joinGame.players)
      .toHaveLength(2)

    expect(response.body.data.joinGame.players[0].username)
      .toBe('Berhan')

    expect(response.body.data.joinGame.players[1].username)
      .toBe('Delal')

  })

})
describe('startGame', () => {

  it('sollte das Spiel starten', async () => {

    // Spiel erstellen
    const createResponse = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`) // NEU
      .send({
        query: `
          mutation {
            createGame(
              playerName: "Berhan"
              maxPlayers: 2
            ) {
              roomCode
            }
          }
        `
      })

    const roomCode =
      createResponse.body.data.createGame.roomCode

    // Zweiter Spieler tritt bei
    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`) // NEU
      .send({
        query: `
          mutation {
            joinGame(
              roomCode: "${roomCode}"
              playerName: "Delal"
            ) {
              roomCode
            }
          }
        `
      })

    // Spiel starten
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`) // NEU
      .send({
        query: `
          mutation {
            startGame(roomCode: "${roomCode}") {
              status
              players {
                username
                handCards {
                  color
                  value
                }
              }
              topCard {
                color
                value
              }
            }
          }
        `
      })

    // Prüft, ob das Spiel läuft und alle Spieler Karten erhalten haben
    expect(response.status).toBe(200)
    expect(response.body.errors).toBeUndefined()

    expect(response.body.data.startGame.status)
      .toBe('running')

    expect(response.body.data.startGame.players)
      .toHaveLength(2)

    expect(response.body.data.startGame.players[0].handCards)
      .toHaveLength(7)

    expect(response.body.data.startGame.players[1].handCards)
      .toHaveLength(7)

    expect(response.body.data.startGame.topCard)
      .toBeDefined()

  })

})
describe('getLobby', () => {

  it('sollte eine wartende Lobby zurückgeben', async () => {
    // Lobby erstellen
    const createResponse = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`) // NEU
      .send({
        query: `
          mutation {
            createGame(
              playerName: "Berhan"
              maxPlayers: 4
            ) {
              roomCode
            }
          }
        `
      })

    const roomCode =
      createResponse.body.data.createGame.roomCode

    // Fragt die wartende Lobby ab.
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`) // NEU
      .send({
        query: `
          query {
            getLobby(roomCode: "${roomCode}") {
              roomCode
              status
              maxPlayers
              players {
                username
              }
            }
          }
        `
      })

    // Prüft die zurückgegebenen Lobbydaten.
    expect(response.status).toBe(200)
    expect(response.body.errors).toBeUndefined()

    expect(response.body.data.getLobby.roomCode)
      .toBe(roomCode)

    expect(response.body.data.getLobby.status)
      .toBe('waiting')

    expect(response.body.data.getLobby.maxPlayers)
      .toBe(4)

    expect(response.body.data.getLobby.players)
      .toHaveLength(1)

    expect(response.body.data.getLobby.players[0].username)
      .toBe('Berhan')

  })

})

// FEHLERFÄLLE
// Testet ungültige GraphQL-Anfragen.
describe('joinGame Fehlerfälle', () => {

  it('sollte einen Fehler zurückgeben wenn das Spiel nicht existiert', async () => {

    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`) // NEU
      .send({
        query: `
          mutation {
            joinGame(
              roomCode: "AAAAAA"
              playerName: "Delal"
            ) {
              roomCode
            }
          }
        `
      })

    expect(response.status).toBe(200)
    expect(response.body.errors).toBeDefined()

  })

})
describe('startGame Fehlerfälle', () => {

  it('sollte einen Fehler zurückgeben wenn nur ein Spieler vorhanden ist', async () => {

    const createResponse = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`) // NEU
      .send({
        query: `
          mutation {
            createGame(
              playerName: "Berhan"
              maxPlayers: 2
            ) {
              roomCode
            }
          }
        `
      })

    const roomCode =
      createResponse.body.data.createGame.roomCode

    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`) // NEU
      .send({
        query: `
          mutation {
            startGame(roomCode: "${roomCode}") {
              status
            }
          }
        `
      })

    expect(response.status).toBe(200)
    expect(response.body.errors).toBeDefined()

  })

})

// SUBSCRIPTIONS
// Testet GraphQL-Subscriptions.
describe('Subscriptions', () => {

  describe('gameUpdated', () => {

    it('sollte eine Subscription besitzen', () => {

      const subscription =
        resolvers.Subscription.gameUpdated

      expect(subscription).toBeDefined()
      expect(typeof subscription.subscribe).toBe('function')

    })

  })

  describe('playerJoined', () => {

    it('sollte eine Subscription besitzen', () => {

      const subscription =
        resolvers.Subscription.playerJoined

      expect(subscription).toBeDefined()
      expect(typeof subscription.subscribe).toBe('function')

    })

  })

})
})
