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
        const key = state.join("").replace(/,/g,"")

        if (useDB) {
            return this.game.db.getQ(key)
        } else {

            action = action.toString().replace(/,/g, "")

            if (this.q[key]===undefined) {
                this.q[key] = {}
            }

            // TODO - fill all action permutations with 1 values, instead of just this action
            if (this.q[key][action]===undefined) {
                this.q[key][action] = 1
            }

            return this.q[key][action]
        }
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
                const b = parseInt(val/9)
                const r = parseInt((val-b*9)/3)
                const c = val%3
                console.log("b r c", b, r, c)

                this.game.makeMove(this.playerIndex, b, r, c)
            })

        } else {

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

                this.getQ(this.lastState, null, true).then(qs => {
                    // console.log("QS", qs, qs[0])
                    console.log("qs:", qs ? qs.length : qs)
                    qs = qs[0]

                    // No knowledge of this state. Set to 1 and make a random move
                    if (qs===undefined) {

                        console.log("dunno lol")

                        // console.log(moves)
                        const move = moves[Math.floor(Math.random()*moves.length)]
                        this.lastMove = move
                        // TODO, set to 1

                        this.game.makeMove(this.playerIndex, this.lastMove[0], this.lastMove[1], this.lastMove[2])

                    } else {

                        delete qs.key
                        delete qs._id

                        const moves = Object.keys(qs)
                        const qVals = Object.values(qs)
                        const maxQ = qVals.slice(0).sort().reverse()[0]

                        this.lastMove = moves[qVals.indexOf(maxQ)].split("").map(d => parseInt(d))
                        this.game.makeMove(this.playerIndex, this.lastMove[0], this.lastMove[1], this.lastMove[2])
                    }
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

            const key = this.lastState.join("").replace(/,/g,"")
            const action = this.lastMove.toString().replace(/,/g, "")
            this.q[key][action] = prev + this.alpha * (value + this.gamma * maxqNew - prev)
        }
    }

    // up/down
    mirrorB (gameState) {

        for (let i=0; i<Math.floor(this.game.span/2); i++) {
            const temp = gameState[i]
            gameState[i] = gameState[this.game.span-1-i]
            gameState[this.game.span-1-i] = temp
        }

        return gameState
    }

    // forward/backward
    mirrorY (gameState) {

        for (let b=0; b<this.game.span; b++) {
            for (let i=0; i<Math.floor(this.game.span/2); i++) {
                const temp = gameState[b][i]
                gameState[b][i] = gameState[b][this.game.span-1-i]
                gameState[b][this.game.span-1-i] = temp
            }
        }

        return gameState
    }

    // left/right
    mirrorX (gameState) {
        for (let b=0; b<this.game.span; b++) {
            for (let r=0; r<this.game.span; r++) {
                for (let i=0; i<Math.floor(this.game.span/2); i++) {
                    const temp = gameState[b][r][i]
                    gameState[b][r][i] = gameState[b][r][this.game.span-1-i]
                    gameState[b][r][this.game.span-1-i] = temp
                }
            }
        }
        return gameState
    }

    // diagonal board down
    mirrorBDown (gameState) {
        for (let y=0; y<this.game.span; y++) {
            for (let b=0; b<this.game.span-1; b++) {
                for (let c=0; c<this.game.span-1-b; c++) {
                    const temp = gameState[b][y][c]
                    gameState[b][y][c] = gameState[this.game.span-1-c][y][this.game.span-1-b]
                    gameState[this.game.span-1-c][y][this.game.span-1-b] = temp
                }
            }
        }
        return gameState
    }

    // diagonal board up
    mirrorBUp (gameState) {
        for (let y=0; y<this.game.span; y++) {
            for (let b=this.game.span-1; b>=0; b--) {
                for (let c=this.game.span-1; c>b; c--) {
                    const temp = gameState[b][y][c]
                    gameState[b][y][c] = gameState[c][y][b]
                    gameState[c][y][b] = temp
                }
            }
        }
        return gameState
    }

    // diagonal rows down (forward)
    mirrorRDown (gameState) {
        for (let b=0; b<this.game.span; b++) {
            for (let r=this.game.span-1; r>b; r--) {
                const temp = gameState[b][r]
                gameState[b][r] = gameState[r][b]
                gameState[r][b] = temp
            }
        }
        return gameState
    }

    // diagonal rows up (forward)
    mirrorRUp (gameState) {
        for (let b=0; b<this.game.span; b++) {
            for (let r=0; r<this.game.span-1-b; r++) {
                const temp = gameState[b][r]
                gameState[b][r] = gameState[this.game.span-1-r][this.game.span-1-b]
                gameState[this.game.span-1-r][this.game.span-1-b] = temp
            }
        }
        return gameState
    }

    // diagonal columns (right)
    mirrorRight (gameState) {
        for (let b=0; b<this.game.span; b++) {
            for (let r=0; r<this.game.span-1; r++) {
                for (let c=0; c<this.game.span-1-r; c++) {
                    const temp = gameState[b][r][c]
                    gameState[b][r][c] = gameState[b][this.game.span-1-c][this.game.span-1-r]
                    gameState[b][this.game.span-1-c][this.game.span-1-r] = temp
                }
            }
        }
        return gameState
    }

    // diagonal columns (left)
    mirrorLeft (gameState) {
        for (let b=0; b<this.game.span; b++) {
            for (let r=this.game.span-1; r>0; r--) {
                for (let c=0; c<this.game.span-1; c++) {
                    const temp = gameState[b][r][c]
                    gameState[b][r][c] = gameState[b][c][r]
                    gameState[b][c][r] = temp
                }
            }
        }
        return gameState
    }



    rotateB (gameState, deg) {

    }

    rotateR (gameState, deg) {

    }

    rotateC (gameState, deg) {

    }

}

typeof window!="undefined" && (window.GamePlayer = GamePlayer)
exports.GamePlayer = GamePlayer