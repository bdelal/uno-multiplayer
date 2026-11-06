import { jest } from "@jest/globals"
import { handleChatMessage, clients } from "../../src/websocket/wsHandler.js"

describe("Chat WebSocket", () => {

    let ws
    beforeEach(() => {
        clients.clear()
        ws = {
            send: jest.fn()
        }
        clients.set(ws, {
            roomCode: "ROOM1",
            playerName: "Alice"
        })
    })

    afterEach(() => {
        clients.clear()
    })

    test("sollte Chatnachricht an alle Spieler senden", () => {

        const message = {
            payload: {
                roomCode: "ROOM1",
                playerName: "Alice",
                text: "Hallo zusammen!"
            }
        }

        handleChatMessage(ws, message)
        expect(ws.send).toHaveBeenCalledTimes(1)
        const sent = JSON.parse(ws.send.mock.calls[0][0])

        expect(sent.type).toBe("CHAT_MESSAGE")
        expect(sent.payload.playerName).toBe("Alice")
        expect(sent.payload.text).toBe("Hallo zusammen!")
        expect(sent.payload.timestamp).toBeDefined()
    })

    test("sollte leere Nachrichten ignorieren", () => {

        const message = {
            payload: {
                roomCode: "ROOM1",
                playerName: "Alice",
                text: ""
            }
        }
        handleChatMessage(ws, message)
        expect(ws.send).not.toHaveBeenCalled()
    })

    test("sollte Nachrichten über 200 Zeichen ignorieren", () => {
        const message = {
            payload: {
                roomCode: "ROOM1",
                playerName: "Alice",
                text: "a".repeat(201)
            }
        }
        handleChatMessage(ws, message)
        expect(ws.send).not.toHaveBeenCalled()
    })

})