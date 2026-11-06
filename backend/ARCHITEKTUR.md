# Technische Dokumentation - UNO Multiplayer

---

## Inhaltsverzeichnis
1. [Architekturüberblick](#1-architekturüberblick)
2. [Datenbanken und Datenmodellierung](#2-datenbanken-und-datenmodellierung)
3. [Rolle von REST und GraphQL](#3-rolle-von-rest-und-graphql)
4. [GraphQL-Schnittstellendefinition](#4-graphql-schnittstellendefinition)
5. [Realtime und Chat](#5-realtime-und-chat)
6. [PWA-Technologien](#6-pwa-technologien)
7. [Browser-Persistenz](#7-browser-persistenz)
8. [Web Components](#8-web-components)
9. [Authentifizierung und Autorisierung](#9-authentifizierung-und-autorisierung)
10. [Rollen- und Rechtekonzept](#10-rollen--und-rechtekonzept)
11. [Schutz der Schnittstellen](#11-schutz-der-schnittstellen)
    

## 1. Architekturüberblick

Frontend und Backend sind getrennt. Sie reden nur über das Netzwerk miteinander (HTTP und WebSocket).

```
FRONTEND (Browser)
Vue 3 + Vue Router + Vite + PWA
    |
    |  REST  |  GraphQL  |  WebSocket
    |
BACKEND (Node.js + Express)
Routes -> Controllers -> Services -> Repositories
    |
MongoDB (Spielzustand)   SQLite (Benutzer, Passkeys)
```

**Schichtenarchitektur im Backend:** Jede Schicht hat genau eine Aufgabe.

- **Routes** (`src/routes/`) - legt URL und HTTP-Methode fest
- **Controllers** (`src/controllers/`) - nimmt Anfrage entgegen, prüft Eingaben, gibt Antwort
- **Services** (`src/services/`) - Spielregeln und Geschäftslogik, keine Datenbankbefehle
- **Repositories** (`src/repositories/`) - alle Datenbankzugriffe (DAO-Muster)
- **Models** (`src/models/`) - Mongoose-Schemas

**Warum so?** Wenn die Datenbank gewechselt wird, muss man nur die Repository-Schicht anfassen. Die Spielregeln bleiben unberührt.

**Beispiel: Lobby beitreten**

```
POST /lobby/join/ABC123
  -> routes/lobby.js
  -> controllers/lobbyController.js   validiert, ruft Service
  -> services/GameService.js          prüft Name
  -> repositories/GameRepository.js   prüft Lobby voll, speichert
  -> models/Game.js -> MongoDB
  -> res.status(200).json({ roomCode, players })
```

---

## 2. Datenbanken und Datenmodellierung

Zwei Datenbanken parallel, je nach Art der Daten.

### MongoDB - Spielzustand

```javascript
gameSchema = {
  roomCode, status, players: [playerSchema], maxPlayers,
  currentPlayerIndex, direction, topCard, drawPile,
  wishedColor, finishedPlayers, winner
}
playerSchema = { username, handCards: [cardSchema], isConnected, ... }
```

**Warum MongoDB?**

- Der Spielzustand gehört zusammen und wird immer komplett gelesen und geschrieben
- Karten stecken direkt im Spieler (`players.handCards`), keine Joins nötig
- Ändert sich bei jedem Zug, ein `game.save()` reicht
- Gesucht wird nur über einen Schlüssel: den `roomCode`

### SQLite - Benutzer und Passkeys

```sql
users    (id, username UNIQUE, email UNIQUE, password, google_id UNIQUE, role)
passkeys (id, user_id, public_key, counter, device_name, created_at)
```

**Warum SQLite?**

- Benutzerdaten sind immer gleich aufgebaut
- `UNIQUE` verhindert doppelte Konten auf Datenbankebene, nicht nur im Code
- Ein Nutzer kann mehrere Passkeys haben (mehrere Geräte) - eine 1:n-Beziehung

**Zwei Entscheidungen:**

`password` darf leer sein. Wer sich mit Google oder Passkey anmeldet, hat kein Passwort.

Der `counter` bei Passkeys zählt bei jedem Login hoch. Steigt er nicht sauber an, wurde der Schlüssel vielleicht kopiert (WebAuthn-Sicherheitsmerkmal).

---

## 3. Rolle von REST und GraphQL

### REST - Aktionen und Anmeldung

```
POST   /lobby/create             Lobby erstellen
POST   /lobby/join/:roomCode     Lobby beitreten
POST   /auth/register            Registrieren
POST   /auth/login               Einloggen, gibt Token zurück
GET    /auth/google              Google-Login
POST   /passkey/...              Passkey anlegen und Login
GET    /admin/users              Alle Nutzer (nur Admin)
DELETE /admin/users/:id          Nutzer löschen (nur Admin)
PATCH  /admin/users/:id/role     Rolle ändern (nur Admin)
GET    /api-docs                 Swagger-Oberfläche
```

**Warum REST?** Klare HTTP-Bedeutung (`POST` legt an, `DELETE` löscht) und aussagekräftige Statuscodes (201, 401, 403, 404).

### GraphQL - Spielzustand lesen

Endpunkt `POST /graphql`, geschützt durch `authenticate`.

```graphql
Query        getGame(roomCode), getLobby(roomCode)
Mutation     createGame, startGame, joinGame
Subscription gameUpdated(roomCode), playerJoined(roomCode)
```

**Warum GraphQL?** Jede View fragt genau die Felder ab, die sie braucht.

```graphql
# LobbyView: nur Namen und Status
query { getGame(roomCode: "ABC123") { players { username } status }}

# Game.vue: der ganze Spielzustand
query { getGame(roomCode: "ABC123") {
  status currentPlayerIndex direction topCard { color value }
  players { username handCards { color value } }
}}
```

Mit REST wären das zwei Endpunkte gewesen, oder einer, der zu viel liefert.

### Aufteilung

```
Login, Registrieren       REST        klare Aktion
Lobby erstellen/beitreten REST        ändert etwas
Spielzustand laden        GraphQL     jede View braucht andere Felder
Karte spielen, Chat       WebSocket   Echtzeit
```

---

## 4. GraphQL-Schnittstellendefinition

Unsere API ist in `src/graphql/typeDefs.js` definiert und wird durch Resolver in `src/graphql/resolvers.js` implementiert.

**Queries (Daten abfragen):**
* `getGame(roomCode: String!)`: Liefert den vollständigen Spielzustand (Handkarten des Nutzers, Spielfeld, Mitspieler).
* `getLobby(roomCode: String!)`: Liefert die Lobby-Informationen (Spielerliste, Lobby-Status).

**Mutations (Daten verändern):**
* `createGame()`: Erstellt eine neue UNO-Lobby.
* `joinGame(roomCode: String!)`: Fügt den aktuell authentifizierten Nutzer einer bestehenden Lobby hinzu.
* `startGame(roomCode: String!)`: Ändert den Lobby-Status auf "gestartet" und initialisiert das Spiel.

**Subscriptions (Echtzeit-Updates):**
* `gameUpdated(roomCode: String!)`: Pusht Updates an den Client, sobald sich der Spielzustand ändert (z.B. Karte gelegt, Zug beendet).
* `playerJoined(roomCode: String!)`: Informiert aktive Lobbymitglieder über neue Beitritte.


## 5.. Realtime und Chat

### Zwei WebSockets auf einem Port

```
ws://localhost:3000/game            Spielzüge, Chat, Emojis
ws://localhost:3000/subscriptions   GraphQL Subscriptions
```

Apollo fängt normalerweise alle WebSocket-Verbindungen ab. Deshalb laufen beide Server mit `noServer: true` und ein eigener Handler verteilt nach Pfad:

```javascript
server.on('upgrade', (req, socket, head) => {
  const token = new URL(req.url, 'http://localhost:3000').searchParams.get('token')
  try { jwt.verify(token, process.env.JWT_SECRET) }
  catch (e) { socket.destroy(); return }

  if (url.pathname === '/game')               wss.handleUpgrade(...)
  else if (url.pathname === '/subscriptions') gqlWss.handleUpgrade(...)
  else                                        socket.destroy()
})
```

Vorteil: Die Token-Prüfung sitzt an einer Stelle für beide WebSockets.

### Eine Verbindung für alle Views

`services/wsClient.js` hält einen Singleton. Alle Views teilen sich eine Verbindung.

```javascript
let ws = null                  // die eine Verbindung
const listeners = new Map()    // 'game' -> Handler, 'chat' -> Handler

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  listeners.forEach((handler) => handler(msg))
}
```

**Warum?** Beim Wechsel von der Lobby ins Spiel bleibt die Verbindung bestehen. Jede View meldet sich mit `onWS('game', handler)` an und in `onUnmounted` mit `offWS('game')` wieder ab, damit keine toten Handler übrig bleiben.

**Auto-Reconnect:** Bricht die Verbindung ab, verbindet sich der Client neu. Maximal 5 Versuche, damit bei einem toten Server keine Endlosschleife entsteht.

### Nachrichten

```
Client -> Server    PLAY_CARD, DRAW_CARD, JOIN_LOBBY, CHAT_MESSAGE, SEND_EMOJI
Server -> alle      GAME_STARTED, CARD_PLAYED, CARD_DRAWN, PLAYER_JOINED
Server -> einen     YOUR_CARDS, ERROR
```

**Prinzip:** Der Client meldet nur, was er tun möchte. Der Server prüft (Ist er dran? Hat er die Karte?), führt aus, speichert und schickt das bestätigte Ergebnis zurück.

### Chat

Der Chat läuft über denselben WebSocket. Keine zweite Verbindung.

```javascript
// ChatPanel.vue
onWS('chat', (msg) => {
  if (msg.type === 'CHAT_MESSAGE') {
    messages.value.push(msg.payload)
    if (!isOpen.value) unreadCount.value++
  }
})
```

Der Server prüft den Text (nicht leer, höchstens 200 Zeichen) und schickt ihn per `broadcast()` an alle im Raum. Nachrichten werden nicht gespeichert, sie leben nur während der Sitzung.

Wer zu welchem Raum gehört, merkt sich der Server in einer `Map` (`ws -> { roomCode, playerName }`).

---

## 6. PWA-Technologien

Eingerichtet über `vite-plugin-pwa` (nutzt Workbox) in der `vite.config.js`.

### Manifest

Macht die App installierbar.

```javascript
manifest: {
  name: 'UNO Multiplayer', short_name: 'UNO',
  theme_color: '#2d0a6e', background_color: '#1a0a3c',
  display: 'standalone',        // startet ohne Browser-Leiste
  start_url: '/',
  icons: [ 192x192, 512x512 ]
}
```

### Service Worker

Ein Skript, das im Hintergrund läuft und zwischen App und Netzwerk sitzt. Es fängt Anfragen ab und entscheidet, ob es sie aus dem Zwischenspeicher (Cache) beantwortet oder ans Netz weitergibt.

Er wird automatisch erzeugt (`registerType: 'autoUpdate'`), aktualisiert sich also bei einem neuen Build von selbst.

```javascript
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],   // App-Hülle vorab speichern

  runtimeCaching: [
    { urlPattern: /\/graphql/, handler: 'NetworkOnly' },
    { urlPattern: /\/lobby/,   handler: 'NetworkOnly' }
  ]
}
```

**Zwei Strategien:**

- **App-Hülle** (JS, CSS, HTML, Icons, Schriften) wird vorab gespeichert. Sie lädt sofort.
- **GraphQL und Lobby** laufen mit `NetworkOnly`, kommen also nie aus dem Cache.

**Offline geht nicht, und das ist Absicht.** Ein Echtzeitspiel braucht eine Live-Verbindung. Ein gespeicherter Spielstand wäre nach dem ersten Zug eines anderen Spielers schon falsch. Gespeichert wird nur die Hülle, nicht der Inhalt.

---

## 7. Browser-Persistenz

### sessionStorage - Anmeldung

```
token   Der JWT
user    Benutzer-Objekt als JSON (id, username, email, role)
```

**Warum sessionStorage?** Er gilt nur für einen Tab und wird beim Schließen automatisch geleert. Der Login gilt also nur für die Sitzung.

Gelesen wird der Token zentral:

```javascript
// services/auth.js
export function authHeaders() {
  const token = sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}
```

Der Helfer sorgt dafür, dass kein `fetch` den Header vergessen kann. Wenn kein Token da ist, wird der `Authorization`-Header ganz weggelassen, statt `Bearer null` zu schicken.

Der WebSocket holt den Token aus derselben Quelle:

```javascript
ws = new WebSocket(`ws://localhost:3000/game?token=${sessionStorage.getItem('token')}`)
```

### localStorage - Avatare

```
uno-avatar-<username>   Bild als Base64-Text
```

**Warum localStorage?** Avatare sollen erhalten bleiben, auch nach dem Schließen des Tabs. Sie sind nicht sicherheitskritisch und gehen nie an den Server.

Damit alle Komponenten ein neues Bild sehen, gibt es zwei Wege: ein eigenes `CustomEvent` für den aktuellen Tab und das eingebaute `storage`-Event für andere Tabs.

### Vergleich

```
                 sessionStorage      localStorage
Inhalt           Token, Benutzer     Avatare
Lebensdauer      bis Tab zugeht      bleibt
Gilt für         nur diesen Tab      alle Tabs
Grund            Sicherheit          Bequemlichkeit
```

---

## 8. Web Components

Das Projekt benutzt **Vue Single-File Components**, keine nativen Web Components nach dem Browser-Standard.

```
                  Web Component            Vue-Komponente (hier)
Definition        customElements.define()  <script setup> + defineProps
CSS-Kapselung     Shadow DOM               <style scoped>
Wiederverwendbar  jedes Framework          nur mit Vue
```

### Entwickelte Komponenten

```
Card.vue           Eine Spielkarte
                   Props: card, playable, disabled, size   Event: @play

ChatPanel.vue      Chatfenster mit Ungelesen-Zähler
                   Props: roomCode, myName

EmojiReaction.vue  Emoji-Reaktionen
                   Props: roomCode, myName

UserMenu.vue       Benutzermenü, Avatar, Logout, Admin-Link
                   keine Props, liest sessionStorage
```

Jede Komponente verwaltet ihren Zustand selbst und redet nach außen nur über Props und Events.

```javascript
// ChatPanel.vue
const props = defineProps({
  roomCode: { type: String, required: true },
  myName:   { type: String, required: true },
})
onUnmounted(() => { offWS('chat') })   // Listener aufräumen
```

**Umstieg auf echte Web Components** wäre mit `defineCustomElement()` möglich:

```javascript
import { defineCustomElement } from 'vue'
customElements.define('uno-chat-panel', defineCustomElement(ChatPanel))
```

---

## 9. Authentifizierung und Autorisierung

### Drei Wege sich anzumelden

```
E-Mail + Passwort   POST /auth/login              bcrypt gegen Hash in SQLite
Google (OAuth 2.0)  GET /auth/google + callback   Frontend: LoginCallback.vue
Passkey (WebAuthn)  POST /passkey/login/start     Challenge und Antwort
```

Alle drei enden mit einem **JWT**. Die Anmeldeart ist damit austauschbar.

### Passwörter

```javascript
await bcrypt.hash(password, 10)                   // beim Registrieren
await bcrypt.compare(password, user.password)     // beim Login
```

In der Datenbank steht nie das Passwort, nur der Hash.

### JWT

Drei Teile: Header, Payload, Signatur.

```javascript
const token = jwt.sign(
  { id: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1d' }
)
```

Der Payload ist nur base64-codiert, **nicht verschlüsselt**. Jeder kann ihn lesen. Deshalb stehen dort nur `id` und `role`, nie ein Passwort.

Die Sicherheit kommt aus der **Signatur**. Der Server unterschreibt mit `JWT_SECRET`. Ändert jemand `role: 'user'` zu `'admin'`, passt die Unterschrift nicht mehr und `jwt.verify` lehnt ab.

**Das `JWT_SECRET` verlässt nie den Server.** Der Client kann den Token vorzeigen, aber keine neuen erzeugen.

### Ablauf

```
1. Client -> POST /auth/login { email, password }
2. Server -> bcrypt.compare gegen SQLite
3. Server -> jwt.sign(payload, JWT_SECRET)
4. Server -> Client: { token, user }
5. Client -> sessionStorage.setItem('token', ...)
6. Client -> jede Anfrage: Authorization: Bearer <token>
7. Server -> jwt.verify bei JEDER Anfrage neu
```

### authenticate-Middleware

```javascript
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Kein Token vorhanden – bitte einloggen' })
    }
    const token = authHeader.split(' ')[1]
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen' })
  }
}
```

Zwei getrennte Meldungen: "Kein Token vorhanden" heißt, der Header fehlt ganz. "Ungültig oder abgelaufen" heißt, ein Token war da, wurde aber abgelehnt.

### Sichtbare Reaktion im Frontend

```
Nicht angemeldet   UserMenu zeigt "Nicht angemeldet" und Login-Button
Angemeldet         Avatar, Abmelden-Button
Rolle admin        zusätzlicher Button "Admin-Bereich"
Lobby voll         Meldung "Lobby ist voll" unter dem Button
Nicht am Zug       Karten sind ausgegraut
```

---

## 10. Rollen- und Rechtekonzept

### Zwei Rollen

```
user    Spielen, Lobbys erstellen und beitreten, chatten
admin   Zusätzlich: Nutzer sehen, löschen, Rollen ändern
```

Die Rolle steht in `users.role` (Standard `'user'`) und wandert beim Login in den Token.

```javascript
// AuthService.register()
const role = (email === process.env.ADMIN_EMAIL) ? 'admin' : 'user'
```

### requireRole-Middleware

```javascript
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user)              return res.status(401).json({ error: 'Nicht eingeloggt' })
    if (req.user.role !== role) return res.status(403).json({ error: 'Keine Berechtigung' })
    next()
  }
}
```

**401 oder 403?**

- **401 Unauthorized:** "Ich weiß nicht, wer du bist." Die Anmeldung fehlt.
- **403 Forbidden:** "Ich weiß, wer du bist, aber du darfst das nicht." Die Rechte fehlen.

### Anwendung

```javascript
// routes/admin.js - erst eingeloggt, dann Admin
router.get("/users",            authenticate, requireRole("admin"), getAllUsers);
router.delete("/users/:id",     authenticate, requireRole("admin"), deleteUser);
router.patch("/users/:id/role", authenticate, requireRole("admin"), updateUserRole);
```

Die Reihenfolge muss so sein: `requireRole` liest `req.user`, und das setzt erst `authenticate`.

### Authentifizierung oder Autorisierung

```
Authentifizierung   Wer bist du?     authenticate prüft die Signatur
Autorisierung       Was darfst du?   requireRole prüft die Rolle
```

Dazu kommt die **Besitzprüfung** im Spiel: Der Server schaut bei jedem Zug, ob der Spieler dran ist und die Karte überhaupt hat (`wsHandler.handlePlayCard`).

**Die Prüfung im Frontend ist nur Anzeige.** `UserMenu` blendet den Admin-Button mit `v-if="isAdmin"` aus. Verbindlich prüft der Server. Wer das Frontend umgeht und `/admin/users` direkt aufruft, läuft in die Middleware.

---

## 11. Schutz der Schnittstellen

```
REST        authenticate (und requireRole) pro Route
GraphQL     authenticate als Middleware vor Apollo
WebSocket   jwt.verify im upgrade-Handler, sonst socket.destroy()
```

### GraphQL

```javascript
// server.js - VOR apolloServer.applyMiddleware
app.use('/graphql', authenticate)
```

Weil die Middleware vor Apollo hängt, kommt keine Anfrage ohne Token durch. Kein Resolver muss selbst prüfen.

**Nachweis:** `http://localhost:3000/graphql` direkt im Browser aufgerufen gibt:

```json
{"error":"Kein Token vorhanden – bitte einloggen"}
```

### WebSocket

Der Token wird beim Verbindungsaufbau geprüft. Ohne gültigen Token kommt die Verbindung gar nicht erst zustande (`socket.destroy()`). Der Schutz gilt für beide WebSockets, weil beide durch denselben Handler laufen.

### CORS

```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}))
```

### Validierung auf mehreren Ebenen

```
Eingabe (Controller)      validateJoinLobby, validateRoomCode
Regeln (Service/Repo)     Lobby voll? Spiel gestartet?
Spielregeln (wsHandler)   Ist er dran? Hat er die Karte? Ist sie spielbar?
Datenbank                 UNIQUE, enum, min/max
```

### Atomare Prüfung gegen Race Conditions

Prüfen und Speichern in zwei Schritten hat eine Lücke: Treten zwei Spieler gleichzeitig bei, können beide die Prüfung bestehen, bevor einer gespeichert ist. Das nennt man Race Condition.

Deshalb passiert beides in **einem** Datenbankbefehl:

```javascript
// GameRepository.addPlayer
const updated = await Game.findOneAndUpdate(
  {
    roomCode,
    status: 'waiting',
    $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] }
  },
  { $push: { players: { username: playerName } } },
  { returnDocument: 'after' }
)

if (!updated) throw new ValidationError('Lobby ist voll')
```

`$expr` vergleicht zwei Felder desselben Dokuments: Spielerzahl gegen `maxPlayers`. Kommt `null` zurück, war die Lobby voll. Die Datenbank sortiert gleichzeitige Zugriffe selbst.

### Der Server entscheidet, wer was sieht

```javascript
// an ALLE: nur die Anzahl der Karten
players: game.players.map(p => ({ username: p.username, cardCount: p.handCards.length }))

// nur an den einen Spieler: die echten Karten
clientWs.send(JSON.stringify({ type: 'YOUR_CARDS', payload: { handCards: p.handCards } }))
```

Die Karten der Gegner verlassen den Server nie in Richtung anderer Spieler. Wer im Browser den Netzwerkverkehr mitliest, sieht sie trotzdem nicht. Das entscheidet der Server, nicht das Frontend.

### Zentrale Fehlerbehandlung

```javascript
res.status(statusCode).json({
  success: false,
  error: {
    message, statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  }
})
```

Der Stacktrace geht nur im Entwicklungsmodus mit. In Produktion bleibt er verborgen.

---

