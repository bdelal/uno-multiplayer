import request from 'supertest'
import app from '../../src/server.js'
import db from '../../src/database/database.js'

describe('Admin API', () => {

  beforeEach(() => {
    db.prepare('DELETE FROM passkeys').run()
    db.prepare('DELETE FROM users').run()
  })

  const registerUser = async (
    username,
    email,
    password = '123456'
  ) => {

    await request(app)
      .post('/auth/register')
      .send({
        username,
        email,
        password
      })
  }

  const loginUser = async (
    email,
    password = '123456'

  ) => {

    const response = await request(app)

      .post('/auth/login')
      .send({
        email,
        password
      })
    return response.body.token
  }

  describe('GET /admin/users', () => {

    it('sollte ohne Token keinen Zugriff erlauben', async () => {

      const response = await request(app)

        .get('/admin/users')
      expect(response.status).toBe(401)
    })

    it('sollte normalen User blockieren', async () => {

      await registerUser(
        'Berhan',
        'user@test.de'
      )

      const token = await loginUser(
        'user@test.de'
      )

      const response = await request(app)
        .get('/admin/users')
        .set(
          'Authorization',
          `Bearer ${token}`
        )

      expect(response.status).toBe(403)
    })

    it('sollte Admin Zugriff erlauben', async () => {

      process.env.ADMIN_EMAIL = 'admin@test.de'
      await registerUser(
        'Admin',
        'admin@test.de'
      )

      const token = await loginUser(
        'admin@test.de'
      )

      const response = await request(app)

        .get('/admin/users')
        .set(
          'Authorization',
          `Bearer ${token}`
        )
      expect(response.status).toBe(200)
      expect(response.body.users)
        .toBeDefined()

    })
  })

  describe('PATCH /admin/users/:id/role', () => {

    it('sollte Admin Rolle ändern können', async () => {

      process.env.ADMIN_EMAIL = 'admin@test.de'

      await registerUser(
        'Admin',
        'admin@test.de'
      )

      await registerUser(
        'User',
        'user@test.de'
      )

      const adminToken = await loginUser(
        'admin@test.de'
      )

      const user = db

        .prepare(
          'SELECT * FROM users WHERE email = ?'
        )
        .get('user@test.de')

      const response = await request(app)

        .patch(`/admin/users/${user.id}/role`)
        .set(
          'Authorization',
          `Bearer ${adminToken}`
        )
        .send({
          role:'admin'
        })
      expect(response.status).toBe(200)
    })
  })
})