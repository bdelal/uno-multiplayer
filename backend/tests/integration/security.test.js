import request from 'supertest'
import WebSocket from 'ws'
import app from '../../src/server.js'
import { connect, closeDatabase, clearDatabase } from '../setup.js'
import { jest } from '@jest/globals'

jest.setTimeout(30000)

// schnittstellenübergreifende Zugriffskontrolle:
// "Wird REST/GraphQL/WebSocket korrekt anhand des Tokens geschützt?"
//    insbesondere REST, GraphQL, WebSocket" 

const PORT = process.env.PORT || 3000

let userToken   
let adminToken 

beforeAll(async () => {
  // Verbindung zur (Test-)Datenbank aufbauen
  await connect()

  // brauchen einen "echten" eingeloggten User (nicht nur irgendein Fake-Token)
  await request(app).post('/auth/register').send({
    username: 'securitytester',
    email: 'securitytester@test.de',
    password: 'test1234'
  })
  const userLogin = await request(app).post('/auth/login').send({
    email: 'securitytester@test.de',
    password: 'test1234'
  })
  userToken = userLogin.body.token

  // Debug-Ausgabe: falls hier "undefined" steht, ist Register/Login schon
  // fehlgeschlagen (z.B. weil die E-Mail aus einem früheren Testlauf schon
  // in eurer users.db existiert, aber mit anderem Passwort)
  if (!userToken) {
    console.error('WARNUNG: userToken konnte nicht erzeugt werden. Login-Antwort:', userLogin.body)
  }

  await request(app).post('/auth/register').send({
    username: 'securityadmin',
    email: process.env.ADMIN_EMAIL,
    password: 'test1234'
  })
  const adminLogin = await request(app).post('/auth/login').send({
    email: process.env.ADMIN_EMAIL,
    password: 'test1234'
  })
  adminToken = adminLogin.body.token

  if (!adminToken) {
    console.error('WARNUNG: adminToken konnte nicht erzeugt werden. Login-Antwort:', adminLogin.body)
  }
})

afterAll(async () => {
  await closeDatabase()
})

describe('Schutz der Schnittstellen', () => {

  describe('REST (/admin/users)', () => {

    // gar kein Authorization-Header mitgeschickt
    it('sollte Zugriff ohne Token verweigern (401)', async () => {
      const response = await request(app).get('/admin/users')
      expect(response.status).toBe(401)
    })

    // Header ist da, aber der Wert ist kein echtes, gültiges JWT
    it('sollte Zugriff mit ungültigem Token verweigern (401)', async () => {
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', 'Bearer dies.ist.kein.gueltiges.token')
      expect(response.status).toBe(401)
    })

    // Token ist gültig, aber der eingeloggte hat nicht die Rolle admin
    it('sollte Zugriff für eingeloggte Nicht-Admins verweigern (403)', async () => {
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
      expect(response.status).toBe(403)
    })

    // Fall 4: alles passt - gültiges Token und role admin
    it('sollte Zugriff für Admins erlauben (200)', async () => {
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(response.status).toBe(200)
    })

  })

  // Graphql
  // Erinnerung: in server.js steht app.use('/graphql', authenticate)
  // vor apolloServer.applyMiddleware(...
  describe('GraphQL (/graphql)', () => {

    it('sollte Zugriff ohne Token verweigern (401)', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({ query: `query { __typename }` })
      expect(response.status).toBe(401)
    })

    it('sollte Zugriff mit ungültigem Token verweigern (401)', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', 'Bearer dies.ist.kein.gueltiges.token')
        .send({ query: `query { __typename }` })
      expect(response.status).toBe(401)
    })

    it('sollte Zugriff mit gültigem Token erlauben (200)', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ query: `query { __typename }` })
      expect(response.status).toBe(200)
    })

  })

//Websocket
// WebSocket-Sicherheit wird nicht automatisiert getestet.
// Grund:
// Der HTTP-/WebSocket-Server wird während der Jest-Tests
// (NODE_ENV === 'test') bewusst nicht gestartet.
// Dadurch kann kein WebSocket-Upgrade stattfinden.
// Die WebSocket-Funktionalität wird separat in
// websocket/wsHandler.test.js und websocket/chat.test.js getestet.

/** 
  describe('WebSocket (/game)', () => {

    it('sollte eine Verbindung ohne Token ablehnen', (done) => {
      // finished-Flag verhindert, dass done() zweimal aufgerufen wird
      // (error UND close können beide feuern)
      let finished = false
      const finish = (err) => {
        if (finished) return
        finished = true
        done(err)
      }

      const ws = new WebSocket(`ws://localhost:${PORT}/game`)

      ws.on('open', () => {
        // Das darf eigentlich nie passieren
        ws.close()
        finish(new Error('Verbindung wurde ohne Token fälschlicherweise angenommen'))
      })

      ws.on('error', () => {
        // Erwartetes Verhalten: server.js ruft socket.destroy() auf-> error
        finish()
      })

      ws.on('close', () => {
        finish()
      })
    })

    it('sollte eine Verbindung mit ungültigem Token ablehnen', (done) => {
      let finished = false
      const finish = (err) => {
        if (finished) return
        finished = true
        done(err)
      }

      const ws = new WebSocket(`ws://localhost:${PORT}/game?token=ungueltiges.token.xyz`)

      ws.on('open', () => {
        ws.close()
        finish(new Error('Verbindung wurde mit ungültigem Token fälschlicherweise angenommen'))
      })

      ws.on('error', () => {
        finish()
      })

      ws.on('close', () => {
        finish()
      })
    })

    it('sollte eine Verbindung mit gültigem Token annehmen', (done) => {

      if (!userToken) {
        return done(new Error('userToken ist leer - Login in beforeAll ist fehlgeschlagen'))
      }

      let finished = false
      const finish = (err) => {
        if (finished) return
        finished = true
        done(err)
      }

      const ws = new WebSocket(`ws://localhost:${PORT}/game?token=${userToken}`)

      ws.on('open', () => {
        // Verbindung stand
        ws.close()
        finish()
      })

      ws.on('error', (err) => {
        finish(new Error(`Verbindung mit gültigem Token wurde abgelehnt: ${err.message}`))
      })
    })
  })*/
})
