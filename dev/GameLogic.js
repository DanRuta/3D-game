"use strict"

class GameLogic {

    constructor ({gameState, gravityEnabled=true, span=3, players=2, isTraining=false, isMultiplayer=false}={}) {

        this.players = []
        this.gravityEnabled = gravityEnabled
        this.span = parseInt(span)
        this.numPlayers = parseInt(players)
        this.isTraining = isTraining // AI
        this.isMultiplayer = isMultiplayer // TODO, will be used to disallow moves until a move is made via WebSocket

        this.gameState = gameState || this.resetBoard() // Allow accepting an existing game state to allow loading existing match
        this.gravity = {
            axis: 0, // 0 for up/down, 1 for left/right, 2 for  forward/backward
            modifier: -1 // -1 for normal, 1 for reverse
        }

        this.board = new GameBoard(this)


        // Set the first player to either AI or human (aka the actual player)
        if (this.isTraining) {
            this.players.push(new GamePlayer("AI", 0))
        } else {
            this.players.push(new GamePlayer("local human", 0))
        }

        // Set the rest to whatever was configured
        for (let p=1; p<players; p++) {

            // TODO, disallow more than 1 other player when playing against AI - model needed would be too big
            if (this.isTraining) {
                this.players.push(new GamePlayer("AI", p))
            } else if (isMultiplayer) {
                this.players.push(new GamePlayer("remote human", p))
            } else {
                this.players.push(new GamePlayer("local human", p))
            }
        }

    }

    // Create the board brand new
    resetBoard () {

        const gameState = []

        for (let b=0; b<this.span; b++) {

            const boardGameState = []

            for (let r=0; r<this.span; r++) {

                const rowGameState = []

                for (let c=0; c<this.span; c++) {
                    rowGameState.push(null)
                }

                boardGameState.push(rowGameState)
            }
            gameState.push(boardGameState)
        }
        return gameState
    }

    initBoards () {

    }

    checkGameStatus () {

    }

    applyGravityToMove () {

    }

    shiftGravity () {

    }

    checkAll () {

    }

    makeMove (b, r, c) {
        console.log("makeMove", b, r, c)
    }

    insertMoveAt () {

    }

}