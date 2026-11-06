import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { ApolloServer } from 'apollo-server-express'
import { useServer } from 'graphql-ws/use/ws'
import { connectMongo } from './db.js'
import dotenv from 'dotenv'
import lobbyRouter from './routes/lobby.js'
import { handleConnection } from './websocket/wsHandler.js'
import { typeDefs } from './graphql/typeDefs.js'
import { resolvers } from './graphql/resolvers.js'

import swaggerUi from 'swagger-ui-express'
import jsYaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import db from "./database/database.js";
import authRoutes from "./routes/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import adminRoutes from "./routes/admin.js"; 
import passkeyRoutes from "./routes/passkey.js"; 

import { authenticate } from './middleware/authMiddleware.js'
import jwt from 'jsonwebtoken'

dotenv.config()

const app = express()
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',  // PWA Preview
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}))
app.use(express.json())
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const swaggerDoc = jsYaml.load(fs.readFileSync(path.join(__dirname, '../openapi.yaml'), 'utf8'))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc))
connectMongo()

const schema = makeExecutableSchema({ typeDefs, resolvers })


const server = createServer(app)

// noServer: true  bedeutet: kein eigener HTTP-Server, Verbindungen kommen vom upgrade Handler
const wss = new WebSocketServer({ 
  noServer: true,
  perMessageDeflate: false, 
})

const gqlWss = new WebSocketServer({ 
  noServer: true,
});


// -------Explizites Routing von WebSocket-Upgrades----

/* Problem: Apollo Server fängt normalerweise ALLE WebSocket Upgrades ab, auch
die, die für /game gedacht sind. Das verursachte den "Invalid frame header" Fehler

Lösung: Beide WebSocket Server laufen mit noServer: ture 
das bedeutet sie verwalten KEINE eigenen HTTP Server Verbindungen, sondern warten 
darauf, dass wir ihnen manuell Verbindungen übergeben.

Der upgrade EventHandler auf dem HTTP Server fängt ALLE WebSock Verbindungsversuche ab 
und routet sie manuell:
 - /game    -> wss (Spiel Websocket, ws.Handler.js)
 - /subscriptions    -> gqlWss (GraphQl Subscriptions)
 - alles andere   -> socket.destroy() (ablehnen)


 So kommt Apollo nie in Kontakt mit Websocket Upgrades

 */

// Wichtig: url.pathname statt req.url weil jetzt ?token=xxx am ende der url ist!!
server.on('upgrade', (req, socket, head) => {
  // Token aus der URL lesen: ws://localhost:3000/game?token=xxx
  const url = new URL(req.url, 'http://localhost:3000')
  const token = url.searchParams.get('token')

  // Sicherheit: ohne gültigen Token keine WebSocket-Verbindung
  try {
    jwt.verify(token, process.env.JWT_SECRET)
  } catch (e) {
    console.log('WS-Verbindung abgelehnt: ungültiger oder fehlender Token')
    socket.destroy()
    return
  }


  if (url.pathname === '/game') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  } else if (url.pathname  === '/subscriptions') {
    gqlWss.handleUpgrade(req, socket, head, (ws) => {
      gqlWss.emit('connection', ws, req)
    })
  } else {
    socket.destroy()
  }
})

const serverCleanup = useServer({ 
  schema,
  onConnect: () => console.log('✅ Verbindung erfolgreich hergestellt!')
}, gqlWss);

const apolloServer = new ApolloServer({ 
  schema,
  subscriptions: false, 
  plugins: [{
    async serverWillStart() {
      return {
        async drainServer() {
          await serverCleanup.dispose()
        }
      }
    }
  }]
})
// GraphQL schützen: nur mit gültigem JWT-Token erreichbar
app.use('/graphql', authenticate)

await apolloServer.start()
apolloServer.applyMiddleware({ app, path: '/graphql' })

wss.on('connection', handleConnection)


app.use('/lobby', lobbyRouter)
app.use('/auth', authRoutes)
app.use('/admin', adminRoutes); 
app.use("/passkey", passkeyRoutes); 

// Fehlerbehandlung
app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
server.listen(process.env.PORT || 3000, () => {
  console.log('Server läuft auf Port 3000')
  console.log('GraphQL: http://localhost:3000/graphql')
  console.log('Game WS: ws://localhost:3000/game')
  console.log('GraphQL WS: ws://localhost:3000/subscriptions')
})
}

export default app