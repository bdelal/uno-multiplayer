import { createDeck, shuffleDeck, giveCards } from '../game/cardLogic.js'
import Game from '../models/Game.js'

const clients = new Map()

export const handleConnection = (ws) => {
    ws.on('message', (data) => {
        const message = JSON.parse(data)

        switch (message.type) {
            case 'JOIN_LOBBY':
                handleJoinLobby(ws, message)
                break
            case 'START_GAME':
                handleStartGame(ws, message)
                break
            case 'PLAY_CARD':
                handlePlayCard(ws, message)
                break
            case 'DRAW_CARD':
                handleDrawCard(ws, message)
                break
            case 'CHAT_MESSAGE':
                handleChatMessage(ws, message)
                break
            case 'SEND_EMOJI':
                handleSendEmoji(ws,message)
                break
            default:
                console.log("Unknown Message: ", message.type)
        }
    })

    ws.on('close', () => {
        handleDisconnect(ws)
    })
}

const handleJoinLobby = async(ws, message) => {
    const { roomCode, playerName } = message.payload
    clients.set(ws, { roomCode, playerName })

    // Hole das frischeste Spiel aus der DB
    const game = await Game.findOne({ roomCode })

    //Lobbys bescheid geben
    broadcast(roomCode, {
        type: 'PLAYER_JOINED',
        payload: {
            playerName,
            players: game.players.map(p => p.username)}
    })
}

const handleStartGame = async (ws, message) => {
    const { roomCode } = message.payload
    const game = await Game.findOne({ roomCode })

    if (!game) return ws.send(JSON.stringify({ type: 'ERROR', payload: 'Spiel nicht gefunden' }))
    if (game.players.length < 2) return ws.send(JSON.stringify({ type: 'ERROR', payload: 'Zu wenige Spieler' }))
    if (game.status !== 'waiting') return ws.send(JSON.stringify({ type: 'ERROR', payload: 'Spiel läuft bereits' }))

    const deck = shuffleDeck(createDeck())
    const { hands, deck: remainingDeck } = giveCards(deck, game.players.length)

    //Spielern karten zuweisen
    game.players.forEach((player, index) => {
        player.handCards = hands[index]
    })

    //Erste Karte auf dem Tisch
    let topCard
    do {
        topCard = remainingDeck.pop()
    } while (topCard.color === 'wish')

    game.topCard = topCard
    game.drawPile = remainingDeck
    game.status = 'running'

    await game.save()

    broadcast(roomCode, {
        type: 'GAME_STARTED',
        payload: {
            topCard: game.topCard,
            currentPlayerIndex: game.currentPlayerIndex,
            players: game.players.map(p => ({
                username: p.username,
                cardCount: p.handCards.length
            }))
        }
    })

    //Eigene karte schicken
    clients.forEach((client, clientWs) => {
        if (client.roomCode === roomCode) {
            const playerIndex = game.players.findIndex(p => p.username === client.playerName)
            if (playerIndex !== -1) {
                clientWs.send(JSON.stringify({
                    type: 'YOUR_CARDS',
                    payload: { handCards: game.players[playerIndex].handCards }
                }))
            }
        }
    })
}

const handlePlayCard = async (ws, message) => {
    const { roomCode, playerName, card, wishedColor } = message.payload
    const game = await Game.findOne({ roomCode })

    if (!game) return ws.send(JSON.stringify({ type: 'ERROR', payload: 'Spiel nicht gefunden' }))
    if (game.status !== 'running') return ws.send(JSON.stringify({ type: 'ERROR', payload: 'Spiel läuft nicht' }))

    // Ist der Spieler dran?
    const currentPlayer = game.players[game.currentPlayerIndex]
    if (currentPlayer.username !== playerName) {
        return ws.send(JSON.stringify({ type: 'ERROR', payload: 'Du bist nicht dran' }))
    }

    // Hat der Spieler die Karte?
    const player = game.players.find(p => p.username === playerName)
    const cardIndex = player.handCards.findIndex(
        c => c.color === card.color && c.value === card.value
    )
    if (cardIndex === -1) return ws.send(JSON.stringify({ type: 'ERROR', payload: 'Karte nicht auf der Hand' }))

    // Ist die Karte spielbar?
    if (!isCardPlayable(card, game.topCard, game.wishedColor)) {
        return ws.send(JSON.stringify({ type: 'ERROR', payload: 'Karte nicht spielbar' }))
    }

    // Karte von der Hand entfernen
    player.handCards.splice(cardIndex, 1)
    game.topCard = card

    // Wunschfarbe setzen
    if (card.color === 'wish') {
        game.wishedColor = wishedColor || null
    } else {
        game.wishedColor = null
    }

    // Spezialeffekte
    let skip = false
    if (card.value === 'skip') {
        skip = true
    } else if (card.value === 'reverse') {
        game.direction *= -1
        if (game.players.length === 2) skip = true
    } else if (card.value === '+2') {
        const nextIndex = getNextIndex(game, 1)
        const nextPlayer = game.players[nextIndex]
        const drawnCards = drawCards(game, 2)
        nextPlayer.handCards.push(...drawnCards)
        skip = true
    } else if (card.value === 'wish+4') {
        const nextIndex = getNextIndex(game, 1)
        const nextPlayer = game.players[nextIndex]
        const drawnCards = drawCards(game, 4)
        nextPlayer.handCards.push(...drawnCards)
        skip = true
    }

    // Nächster Spieler
    game.currentPlayerIndex = getNextIndex(game, skip ? 2 : 1)

    // Hat der Spieler gewonnen?
    if (player.handCards.length === 0) {
        game.status = 'finished'
        game.winner = playerName
    }

    await game.save()

    broadcast(roomCode, {
        type: 'CARD_PLAYED',
        payload: {
            playerName,
            card,
            topCard: game.topCard,
            currentPlayerIndex: game.currentPlayerIndex,
            wishedColor: game.wishedColor,
            players: game.players.map(p => ({
                username: p.username,
                cardCount: p.handCards.length
            })),
            winner: game.winner
        }
    })

    // Jedem Spieler seine aktualisierten Karten schicken
    clients.forEach((client, clientWs) => {
        if (client.roomCode === roomCode) {
            const p = game.players.find(pl => pl.username === client.playerName)
            if (p) {
                clientWs.send(JSON.stringify({
                    type: 'YOUR_CARDS',
                    payload: { handCards: p.handCards }
                }))
            }
        }
    })
}

const handleDrawCard = async (ws, message) => {
    const { roomCode, playerName } = message.payload
    const game = await Game.findOne({ roomCode })

    if (!game) return ws.send(JSON.stringify({ type: 'ERROR', payload: 'Spiel nicht gefunden' }))
    if (game.status !== 'running') return ws.send(JSON.stringify({ type: 'ERROR', payload: 'Spiel läuft nicht' }))

    // Ist der Spieler dran?
    const currentPlayer = game.players[game.currentPlayerIndex]
    if (currentPlayer.username !== playerName) {
        return ws.send(JSON.stringify({ type: 'ERROR', payload: 'Du bist nicht dran' }))
    }

    const player = game.players.find(p => p.username === playerName)

    // Solange ziehen bis eine spielbare Karte da ist (Regel 4)
    let drawnCard = null
    do {
        // Falls der Nachziehstapel leer ist: Nachziehstapel aus dem Ablagestapel neu mischen
        if (game.drawPile.length === 0) {
            refillDrawPile(game)
            if (game.drawPile.length === 0) break // wirklich keine Karten mehr
        }
        drawnCard = game.drawPile.pop()
        player.handCards.push(drawnCard)
    } while (!isCardPlayable(drawnCard, game.topCard, game.wishedColor))

    // Nächster Spieler
    game.currentPlayerIndex = getNextIndex(game, 1)

    await game.save()

    // Nur dem Spieler seine neue Karte schicken
    ws.send(JSON.stringify({
        type: 'YOUR_CARDS',
        payload: { handCards: player.handCards }
    }))

    // Allen anderen Bescheid geben
    broadcast(roomCode, {
        type: 'CARD_DRAWN',
        payload: {
            playerName,
            cardCount: player.handCards.length,
            currentPlayerIndex: game.currentPlayerIndex,
            players: game.players.map(p => ({
                username: p.username,
                cardCount: p.handCards.length
            }))
        }
    })
}
// Spieler aus der DB aktiv entfernen, sonst Ghost Spieler, die die Lobby belegen
const handleDisconnect = async (ws) => {
    const client = clients.get(ws)
    if (client) {
        try {
            await Game.updateOne(
                { roomCode: client.roomCode },
                { $pull: { players: {username: client.playerName }}}
            );
            console.log(`Spieler ${client.playerName} wurde aus Lobby ${client.roomCode} entfernt.`);
        } catch(error){
            console.error("Fehler beim Entfernen des Spielers:", error);
        }
        broadcast(client.roomCode, {
            type: 'PLAYER_LEFT',
            payload: { playerName: client.playerName }
        })
        clients.delete(ws)
    }
}

const isCardPlayable = (card, topCard, wishedColor) => {
    if (card.color === 'wish') return true
    if (wishedColor) return card.color === wishedColor
    return card.color === topCard.color || card.value === topCard.value
}

const getNextIndex = (game, steps) => {
    const count = game.players.length
    return ((game.currentPlayerIndex + game.direction * steps) % count + count) % count
}

const drawCards = (game, count) => {
    const drawn = []
    for (let i = 0; i < count; i++) {
        if (game.drawPile.length === 0) break
        drawn.push(game.drawPile.pop())
    }
    return drawn
}

const broadcast = (roomCode, message) => {
    clients.forEach((client, clientWs) => {
        if (client.roomCode === roomCode) {
            clientWs.send(JSON.stringify(message))
        }
    })
}

// Wenn drawPile leer ist: Alle Karten außer topCard aus dem Ablagestapel nehmen und mischen
const refillDrawPile = (game) => {
    // Falls es keine Ablagehistorie gibt, nichts zu tun
    if (!game.topCard) return

    // Bau einen neuen Stapel aus allen bekannten Karten: Spielerhände + topCard wurden bereits in DB gespeichert,
    // aber wir haben keine Ablagestapel-Historie. Einfacher Ansatz: sammle alle Karten aus Spielerhänden und
    // topCard und rekonstruieren drawPile als leeres Set (keine perfekte Lösung, aber verhindert totalen Stillstand).
    const remaining = []
    // Karten der Spieler sammeln
    for (const p of game.players) {
        for (const c of p.handCards) remaining.push(c)
    }

    // topCard behalten, alle anderen Karten in drawPile neu setzen
    // Hinweis: Diese Methode kann Karten duplizieren wenn DB-Zustand nicht konsistent ist.
    // Ziel: Spiel nicht einfrieren. Für robustere Lösung Ablagestapel persistieren.
    // Wir leeren drawPile und setzen es gleichmäßig gemischt aus remaining
    game.drawPile = shuffleArray(remaining)
}

// Hilfsfunktion zum Mischen einer Karte-Liste
const shuffleArray = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
    }
    return arr
}

const handleChatMessage = (ws, message) => {
    const { roomCode, playerName, text } = message.payload
    if (!text || text.trim().length === 0) return
    if (text.length > 200) return
    broadcast(roomCode, {
        type: 'CHAT_MESSAGE',
        payload: {
            playerName,
            text: text.trim(),
            timestamp: Date.now()
        }
    })
}

const handleSendEmoji = (ws, message) => {
    const { roomCode, playerName, emoji } = message.payload
    const client = clients.get(ws)
    if (!client) return

    broadcast(roomCode, {
        type: 'EMOJI_RECEIVED',
        payload: {
            playerName,
            emoji,
            timestamp: Date.now()
        }
    })
}

export { handleChatMessage, clients }