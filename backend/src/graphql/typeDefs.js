export const typeDefs = `#graphql
  type Card {
    color: String!
    value: String!
  }

  type Player {
    username: String!
    isConnected: Boolean!
    handCards: [Card!]
  }

  type Game {
    roomCode: String!
    status: String!
    players: [Player!]!
    maxPlayers: Int!
    topCard: Card
    currentPlayerIndex: Int!
    direction: Int!
    wishedColor: String
    winner: String
  }

  type Query {
    getGame(roomCode: String!): Game
    getLobby(roomCode: String!): Game
  }

  type Mutation {
    createGame(playerName: String!, maxPlayers: Int!): Game!
    joinGame(roomCode: String!, playerName: String!): Game!
    startGame(roomCode: String!): Game!
  }

  type Subscription {
    gameUpdated(roomCode: String!): Game
    playerJoined(roomCode: String!): Player
  }
`