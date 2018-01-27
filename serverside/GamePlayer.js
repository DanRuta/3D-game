"use strict"

class GamePlayer {// eslint-disable-line

    constructor (type, playerIndex, game, {epsilon=0.2, alpha=0.3, gamma=0.9}={}) {

        console.log(`new ${type} player: ${playerIndex}`)

        this.type = type
        this.game = game // Two way binding
        this.playerIndex = playerIndex

        if (type == "AI") {
            this.q = {}
            this.epsilon = epsilon
            this.alpha = alpha
            this.gamma = gamma
            // this.lastState = game.gameState.slice(0)
            this.lastState = JSON.parse(JSON.stringify(game.gameState))
            this.lastMove = undefined
        }
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

    getQ (state, action) {

        const key = state.join("").replace(/,/g,"") + action.toString().replace(/,/g, "")

        if (this.q[key]==undefined) {
            this.q[key] = 1
        }

        return this.q[key]
    }

    // TODO, include multiple boards, when the time comes
    getAvailableMoves (gameState) {
        const moves = []

        for (let b=0; b<this.game.span; b++) {
            for (let r=0; r<this.game.span; r++) {
                for (let c=0; c<this.game.span; c++) {
                    if (Number.isNaN(parseInt(gameState[b][r][c]))) {
                        moves.push([b, r, c])
                    }
                }
            }
        }

        // shuffle(moves)
        return moves
    }

    pickMove (gameState) {

        if (this.type != "AI") return

        // Deep copy - TODO, optimize
        this.lastState = JSON.parse(JSON.stringify(gameState))
        const moves = this.getAvailableMoves(this.lastState)

        // Explore
        if (Math.random() < this.epsilon) {
            const index = Math.floor(Math.random() * moves.length)
            this.lastMove = moves[index]
            this.game.makeMove(this.playerIndex, this.lastMove[0], this.lastMove[1], this.lastMove[2])
            return
        }

        const qs = []

        for (let m=0; m<moves.length; m++) {
            qs.push(this.getQ(this.lastState, moves[m]))
        }

        const maxQ = qs.slice(0).sort().reverse()[0]

        this.lastMove = moves[qs.indexOf(maxQ)]
        this.game.makeMove(this.playerIndex, this.lastMove[0], this.lastMove[1], this.lastMove[2])
    }

    reward (value, gameState) {

        if (this.type != "AI") return

        if (this.lastMove) {

            const prev = this.getQ(this.lastState, this.lastMove)
            const aMoves = this.getAvailableMoves(this.lastState)
            let maxqNew = 0

            for (let a=0; a<aMoves.length; a++) {
                maxqNew = Math.max(maxqNew, this.getQ(gameState, aMoves[a]))
            }

            const key = this.lastState.join("").replace(/,/g,"") + this.lastMove.toString().replace(/,/g, "")
            this.q[key] = prev + this.alpha * (value + this.gamma * maxqNew - prev)
        }
    }

}

typeof window!="undefined" && (window.GamePlayer = GamePlayer)
exports.GamePlayer = GamePlayer