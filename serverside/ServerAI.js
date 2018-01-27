"use strict"

// For prod use
class ServerAI {

    constructor (q) {
        this.q = q
        // TODO, use database for this, instead of a monolothic json file
        console.log("loaded", Object.keys(this.q).length, "qs")
    }

    getQ (state, action) {
        const key = state.join("").replace(/,/g,"") + action.toString().replace(/,/g, "")

        if (this.q[key]==undefined) {
            console.log(key, "is undefined")
            this.q[key] = 1
        }

        return this.q[key]
    }

    getAvailableMoves (gameState) {
        const moves = []
        const span = gameState.length

        for (let b=0; b<span; b++) {
            for (let r=0; r<span; r++) {
                for (let c=0; c<span; c++) {
                    if (Number.isNaN(parseInt(gameState[b][r][c]))) {
                        moves.push([b, r, c])
                    }
                }
            }
        }

        return moves
    }

    pickMove (gameState) {

        const moves = this.getAvailableMoves(gameState)
        const qs = []

        for (let m=0; m<moves.length; m++) {
            qs.push(this.getQ(gameState, moves[m]))
        }

        const maxQ = qs.slice(0).sort().reverse()[0]
        return moves[qs.indexOf(maxQ)]
    }

    reward (value, gameState) {
        // TODO, update the data. This would add/update database record
    }

}

exports.ServerAI = ServerAI