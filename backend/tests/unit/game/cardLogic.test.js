import { 
  createDeck, 
  shuffleDeck, 
  giveCards, 
  isCardPlayable, 
  getNextIndex, 
  drawCards 
} from '../../../src/game/cardLogic.js'


describe('cardLogic', () => {

  describe('createDeck', () => {
    
    it('sollte 108 Karten erstellen', () => {
      // Ein UNO Deck hat immer genau 108 Karten
      const deck = createDeck()
      expect(deck).toHaveLength(108)
    })

    it('sollte 8 Wunschkarten enthalten', () => {
      // 4x wish + 4x wish+4 = 8 Stück
      const deck = createDeck()
      const wishCards = deck.filter(c => c.color === 'wish')
      expect(wishCards).toHaveLength(8)
    })

    it('sollte keine ungültigen Farben enthalten', () => {
      const deck = createDeck()
      const validColors = ['red', 'green', 'blue', 'yellow', 'wish']
      deck.forEach(card => {
        expect(validColors).toContain(card.color)
      })
    })
  })

  describe('shuffleDeck', () => {

    it('sollte die gleiche Anzahl Karten haben nach dem Mischen', () => {
      // Mischen darf keine Karten verlieren!
      const deck = createDeck()
      const shuffled = shuffleDeck(deck)
      expect(shuffled).toHaveLength(deck.length)
    })

    it('sollte das originale Deck nicht verändern', () => {
      // shuffleDeck macht eine Kopie, original bleibt gleich
      const deck = createDeck()
      const original = [...deck]
      shuffleDeck(deck)
      expect(deck).toEqual(original)
    })
  })

  describe('giveCards', () => {

    it('sollte jedem Spieler 7 Karten geben', () => {
      // Jeder Spieler bekommt am Anfang genau 7 Karten
      const deck = shuffleDeck(createDeck())
      const { hands } = giveCards(deck, 4)
      hands.forEach(hand => {
        expect(hand).toHaveLength(7)
      })
    })

    it('sollte für jeden Spieler eine Hand erstellen', () => {
      const deck = shuffleDeck(createDeck())
      const { hands } = giveCards(deck, 3)
      expect(hands).toHaveLength(3)
    })
  })

  describe('isCardPlayable', () => {

    it('Wunschkarte ist immer spielbar', () => {
      // wish Karten können immer gespielt werden
      const wishCard = { color: 'wish', value: 'wish' }
      const topCard = { color: 'red', value: '5' }
      expect(isCardPlayable(wishCard, topCard, null)).toBe(true)
    })

    it('Karte mit gleicher Farbe ist spielbar', () => {
      const card = { color: 'red', value: '3' }
      const topCard = { color: 'red', value: '7' }
      expect(isCardPlayable(card, topCard, null)).toBe(true)
    })

    it('Karte mit gleichem Wert ist spielbar', () => {
      const card = { color: 'blue', value: '5' }
      const topCard = { color: 'red', value: '5' }
      expect(isCardPlayable(card, topCard, null)).toBe(true)
    })

    it('Karte mit falscher Farbe und falschem Wert ist nicht spielbar', () => {
      const card = { color: 'blue', value: '3' }
      const topCard = { color: 'red', value: '7' }
      expect(isCardPlayable(card, topCard, null)).toBe(false)
    })

    it('Karte muss wishedColor matchen wenn gesetzt', () => {
      // Nach einer Wunschkarte muss die gespielte Karte die gewünschte Farbe haben
      const card = { color: 'blue', value: '3' }
      const topCard = { color: 'wish', value: 'wish' }
      expect(isCardPlayable(card, topCard, 'blue')).toBe(true)
      expect(isCardPlayable(card, topCard, 'red')).toBe(false)
    })
  })

  describe('getNextIndex', () => {

    it('sollte den nächsten Spieler vorwärts berechnen', () => {
      // Spieler 0 ist dran, direction=1, nächster ist Spieler 1
      const game = { players: [1, 2, 3, 4], currentPlayerIndex: 0, direction: 1 }
      expect(getNextIndex(game, 1)).toBe(1)
    })

    it('sollte den nächsten Spieler rückwärts berechnen', () => {
      // direction=-1 bedeutet Spielrichtung umgekehrt
      const game = { players: [1, 2, 3, 4], currentPlayerIndex: 0, direction: -1 }
      expect(getNextIndex(game, 1)).toBe(3)
    })

    it('sollte am Ende wieder von vorne anfangen', () => {
      // Letzter Spieler → nächster ist wieder Spieler 0
      const game = { players: [1, 2, 3, 4], currentPlayerIndex: 3, direction: 1 }
      expect(getNextIndex(game, 1)).toBe(0)
    })
  })
})