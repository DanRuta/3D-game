"use strict"

class GamePlayer {// eslint-disable-line

    constructor (type, playerIndex, game) {

        console.log(`new ${type} player: ${playerIndex}`)

        this.type = type
        this.game = game // Two way binding
        this.playerIndex = playerIndex
    }

    clearLastState () {
        for (let b=0; b<this.game.span; b++) {
            for (let r=0; r<this.game.span; r++) {
                for (let c=0; c<this.game.span; c++) {
                    this.lastState[b][r][c] = " "
                }
            }
        }
        this.lastMove = undefined
    }

    pickMove (gameState) {

        if (this.type != "AI") return

        fetch("./getAIMove", {
            method: "post",
            body: JSON.stringify({gameState})
        })
        .then(r => r.json())
        .then(({move}) => {
            const [b, r, c] = move
            this.game.makeMove(this.playerIndex, b, r, c)
        })
    }

    reward (value, gameState) {

        if (this.type != "AI") return

        fetch("./rewardAI", {
            method: "post",
            body: JSON.stringify({value, gameState})
        })
    }

}

typeof window!="undefined" && (window.exports = window.exports || {})
typeof window!="undefined" && (window.GamePlayer = GamePlayer)
exports.GamePlayer = GamePlayer