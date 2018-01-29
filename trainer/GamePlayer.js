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

    getQ (state, action, useDB) {
        if (useDB) {
            const key = state.join("").replace(/,/g,"") + action.toString().replace(/,/g, "")
            return game.db.getQ(key)

            // return new Promise((resolve, reject) => {

            //     console.log("q[0]", this.q['                           021'])

            //     if (this.q[key]==undefined) {
            //         console.log(key, "is undefined")
            //         this.q[key] = 1
            //     }

            //     // return this.q[key]
            //     resolve(this.q[key])
            // })
        } else {
            const key = state.join("").replace(/,/g,"") + action.toString().replace(/,/g, "")

            if (this.q[key]==undefined) {
                // console.log(key, "is undefined")
                this.q[key] = 1
            }

            return this.q[key]
        }
    }

    // TODO, include multiple boards, when the time comes
    getAvailableMoves (gameState) {
        const moves = []

        // for (let b=0; b<this.game.span; b++) {
            for (let r=0; r<this.game.span; r++) {
                for (let c=0; c<this.game.span; c++) {
                    if (Number.isNaN(parseInt(gameState[0][r][c]))) {
                        moves.push([0, r, c])
                    }
                }
            }
        // }

        // shuffle(moves)
        return moves
    }

    pickMove (gameState) {

        if (this.type != "AI") {

            global.reader = global.readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })

            global.reader.question("Select move (1-9):", response => {
                global.reader.close()

                const val = parseInt(response)-1
                const r = parseInt(val/3)
                const c = val%3
                console.log("r c", r, c)

                global.game.makeMove(this.playerIndex, 0, r, c)
            })

        } else {


            // const moves = this.getAvailableMoves(gameState)
            // // const moves = this.getAvailableMoves([gameState[0]])
            // const qs = []

            // for (let m=0; m<moves.length; m++) {
            //     qs.push(this.getQ(gameState, moves[m]))
            // }

            // const maxQ = qs.slice(0).sort().reverse()[0]
            // this.game.makeMove(this.playerIndex, moves[qs.indexOf(maxQ)][0], moves[qs.indexOf(maxQ)][1], moves[qs.indexOf(maxQ)][2])


            // Deep copy - TODO, optimize
            this.lastState = JSON.parse(JSON.stringify(gameState))
            const moves = this.getAvailableMoves(this.lastState)

            // Explore
            if (Math.random() < this.epsilon) {
                const index = Math.floor(Math.random() * moves.length)
                this.lastMove = moves[index]
                // console.log("exploring")
                this.game.makeMove(this.playerIndex, this.lastMove[0], this.lastMove[1], this.lastMove[2])
                return
            }

                if (this.game.useDB) {
                    console.log("this.game.useDB", this.game.useDB)
                }

            if (this.game.useDB) {
                const queries = []

                for (let m=0; m<moves.length; m++) {
                    queries.push(this.getQ(this.lastState, moves[m], true))
                    // qs.push(this.getQ(this.lastState, moves[m]))
                    // .then(q => qs.push(q))
                }

                Promise.all(queries).then(qs => {
                    qs = qs.map(record => record[0].value)
                    console.log("qs", qs)
                    console.log("acc qs", [...new Array(moves.length)].map((_, i) => this.getQ(this.lastState, moves[i], false)))
                    const maxQ = qs.slice(0).sort().reverse()[0]

                    this.lastMove = moves[qs.indexOf(maxQ)]
                    this.game.makeMove(this.playerIndex, this.lastMove[0], this.lastMove[1], this.lastMove[2])
                })
            } else {

                const qs = []

                for (let m=0; m<moves.length; m++) {
                    qs.push(this.getQ(this.lastState, moves[m]))
                }

                const maxQ = qs.slice(0).sort().reverse()[0]
                this.lastMove = moves[qs.indexOf(maxQ)]
                this.game.makeMove(this.playerIndex, this.lastMove[0], this.lastMove[1], this.lastMove[2])
            }
        }
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