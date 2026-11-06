export const createDeck = () => {
    const colors = ['red','green','blue','yellow']
    const values= ['0','1','2','3','4','5','6','7','8','9','skip','reverse','+2']
    const deck = []

    //hier wird Farbe zur Zahl gesetzt
    for (const color of colors){
        for( const value of values){
            deck.push({color,value})
            if (value !== '0') deck.push({ color, value}) //alle karten doppelt außer 0
        }
    }

    //Specialkarten
    for(let i=0;i< 4; i++){
        deck.push({color: 'wish', value: 'wish'})
        deck.push({color: 'wish', value: 'wish+4'})
    }

    return deck
}

// Deck mischen
export const shuffleDeck= (deck) =>{
    const d = [...deck]
    for(let i= d.length -1; i> 0; i--){
        const j = Math.floor(Math.random() * (i+1));
        const temp = d[i]
        d[i] = d[j]
        d[j] = temp
    }
    return d
}

//Karten verteilen
export const giveCards = (deck,playerCount) =>{
    const hands = Array.from({length: playerCount}, () =>[])
    for(let i= 0; i<7*playerCount;i++){
        hands[i % playerCount].push(deck.pop())
    }
    return {hands, deck}
}

/**
 * Prüft ob eine Karte spielbar ist
 * @param {object} card - Karte die gespielt werden soll
 * @param {object} topCard - Die aktuelle obere Karte
 * @param {string} wishedColor - Gewünschte Farbe (bei Wunschkarte)
 * @returns {boolean}
 */
export const isCardPlayable = (card, topCard, wishedColor) => {
    if (card.color === 'wish') return true
    if (wishedColor) return card.color === wishedColor
    return card.color === topCard.color || card.value === topCard.value
}

/**
 * Berechnet den Index des nächsten Spielers
 * @param {object} game - Game Objekt
 * @param {number} steps - Wie viele Schritte
 * @returns {number} Index des nächsten Spielers
 */
export const getNextIndex = (game, steps) => {
    const count = game.players.length
    return ((game.currentPlayerIndex + game.direction * steps) % count + count) % count
}

/**
 * Zieht eine bestimmte Anzahl Karten vom Nachziehstapel
 * @param {object} game - Game Objekt
 * @param {number} count - Anzahl der Karten
 * @returns {array} Gezogene Karten
 */
export const drawCards = (game, count) => {
    const drawn = []
    for (let i = 0; i < count; i++) {
        if (game.drawPile.length === 0) break
        drawn.push(game.drawPile.pop())
    }
    return drawn
}