import { pubsub } from './pubsub.js';
import Game from '../models/Game.js'
import { createDeck, shuffleDeck, giveCards } from '../game/cardLogic.js'
import { withFilter } from 'graphql-subscriptions';

//const pubsub = new PubSub()

const EVENTS = {
  GAME_UPDATED: 'GAME_UPDATED',
  PLAYER_JOINED: 'PLAYER_JOINED',
}

export const resolvers = {
  Query: {
    getGame: async (_, { roomCode }) => {
      return await Game.findOne({ roomCode })
    },
    getLobby: async (_, { roomCode }) => {
      return await Game.findOne({ roomCode, status: 'waiting' })
    }
  },

  Mutation: {
    createGame: async (_, { playerName, maxPlayers }) => {
      const { v4: uuidv4 } = await import('uuid')
      const game = new Game({
        roomCode: uuidv4().substring(0, 6).toUpperCase(),
        players: [{ username: playerName }],
        maxPlayers
      })
      await game.save()
      pubsub.publish(EVENTS.GAME_UPDATED, { gameUpdated: game })
      return game
    },

    startGame: async (_, { roomCode }) => {
      const game = await Game.findOne({ roomCode })
      if (!game) throw new Error('Spiel nicht gefunden')
      if (game.players.length < 2) throw new Error('Mindestens 2 Spieler nötig')
      if (game.status !== 'waiting') throw new Error('Spiel läuft bereits')

      const deck = shuffleDeck(createDeck())
      const { hands, deck: remainingDeck } = giveCards(deck, game.players.length)

      game.players.forEach((player, index) => {
        player.handCards = hands[index]
      })

      let topCard
      do {
        topCard = remainingDeck.pop()
      } while (topCard.color === 'wish')

      game.topCard = topCard
      game.drawPile = remainingDeck
      game.status = 'running'
      await game.save()

      pubsub.publish(EVENTS.GAME_UPDATED, { gameUpdated: game })
      return game
    },

    joinGame: async (_, { roomCode, playerName }) => {
      const game = await Game.findOne({ roomCode })
      if (!game) throw new Error('Spiel nicht gefunden')
      if (game.players.length >= game.maxPlayers) throw new Error('Lobby voll')
      game.players.push({ username: playerName })
      await game.save()
      pubsub.publish(EVENTS.PLAYER_JOINED, { playerJoined: game.players.at(-1), roomCode })
      pubsub.publish(EVENTS.GAME_UPDATED, { gameUpdated: game })
      return game
    }
  },
/*
  Subscription: {
    gameUpdated: {
      subscribe: (_, { roomCode }) => {
        return pubsub.asyncIterableIterator(EVENTS.GAME_UPDATED)
      },
      resolve: (payload, { roomCode }) =>
        payload.gameUpdated.roomCode === roomCode ? payload.gameUpdated : null
    },
    playerJoined: {
      subscribe: () => pubsub.asyncIterableIterator(EVENTS.PLAYER_JOINED),
      resolve: (payload, { roomCode }) =>
        payload.roomCode === roomCode ? payload.playerJoined : null
    }
  }*/
  
  Subscription: {
    gameUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.GAME_UPDATED]),
        (payload, variables) => payload.gameUpdated.roomCode === variables.roomCode
      )
    },
    playerJoined: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.PLAYER_JOINED]),
        (payload, variables) => payload.roomCode === variables.roomCode
      )
    }
  }


}

export { pubsub }