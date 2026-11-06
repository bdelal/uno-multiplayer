import request from 'supertest'
import app from '../../src/server.js'
import db from '../../src/database/database.js'

describe('Auth API', () => {
  beforeEach(() => {
  db.prepare('DELETE FROM passkeys').run()
  db.prepare('DELETE FROM users').run()
})

  describe('POST /auth/register', () => {

    it('sollte einen neuen Benutzer registrieren', async () => {

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'Berhan',
          email: 'berhan@test.de',
          password: '123456'
        })

      expect(response.status).toBe(201)
      expect(response.body.message)
        .toBe('Registrierung erfolgreich')

      expect(response.body.user.username)
        .toBe('Berhan')

      expect(response.body.user.email)
        .toBe('berhan@test.de')

    })

    it('sollte Fehler werfen wenn Daten fehlen', async () => {

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: '',
          email: '',
          password: ''
        })

      expect(response.status).toBe(400)
    })

    it('sollte keine doppelte Email erlauben', async () => {

      await request(app)
        .post('/auth/register')
        .send({
          username:'Berhan',
          email:'test@test.de',
          password:'123456'
        })
      const response = await request(app)
        .post('/auth/register')
        .send({
          username:'Andere',
          email:'test@test.de',
          password:'123456'

        })
      expect(response.status).not.toBe(201)
    })
  })

  describe('POST /auth/login', () => {

    it('sollte Login mit richtigen Daten erlauben', async () => {

      await request(app)
        .post('/auth/register')
        .send({
          username:'Berhan',
          email:'login@test.de',
          password:'123456'
        })

      const response = await request(app)
        .post('/auth/login')
        .send({
          email:'login@test.de',
          password:'123456'
        })

      expect(response.status).toBe(200)
      
      expect(response.body.token)
        .toBeDefined()

      expect(response.body.user.email)
        .toBe('login@test.de')

    })

    it('sollte falsches Passwort ablehnen', async () => {

      await request(app)
        .post('/auth/register')
        .send({
          username:'Berhan',
          email:'wrong@test.de',
          password:'123456'
        })

      const response = await request(app)
        .post('/auth/login')
        .send({
          email:'wrong@test.de',
          password:'falsch'
        })

      expect(response.status).toBe(401)
    })

    it('sollte unbekannten Benutzer ablehnen', async () => {

      const response = await request(app)
        .post('/auth/login')
        .send({
          email:'nicht@test.de',
          password:'123456'
        })
      expect(response.status).toBe(401)
    })
  })
})