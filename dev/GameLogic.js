"use strict"

class GameLogic {// eslint-disable-line

    constructor ({gameState, gravityEnabled=true, span=3, players=2, isTraining, isMultiplayer, aiOpponent}={}) {

        this.players = []
        this.gravityEnabled = gravityEnabled
        this.span = parseInt(span)
        this.numPlayers = parseInt(players)
        this.isTraining = isTraining // AI
        this.aiOpponent = aiOpponent // AI
        this.isMultiplayer = isMultiplayer // TODO, will be used to disallow moves until a move is made via WebSocket

        this.gameState = gameState || this.resetGame() // Allow accepting an existing game state to allow loading existing match
        this.gravity = {
            axis: 0, // 0 for up/down, 1 for left/right, 2 for  forward/backward
            modifier: -1 // -1 for normal, 1 for reverse
        }
        this.directions = {
            up: 0,
            down: 0,
            left: 1,
            right: 1,
            forward: 2,
            backward: 2
        }
        this.modifiers = {
            up: 1,
            down: -1,
            left: -1,
            right: 1,
            forward: -1,
            backward: 1
        }

        // Randomize who starts
        this.playerIndex = Math.floor(Math.random()*players)
        this.board = new GameBoard(this)

        // Set the first player to either AI or human (aka the actual player)
        if (this.aiOpponent) {
            this.players.push(new GamePlayer("AI", 0, this))
        } else {
            this.players.push(new GamePlayer("local human", 0))
        }

        // Set the rest to whatever was configured
        for (let p=1; p<players; p++) {

            // TODO, disallow more than 1 other player when playing against AI - model needed would be too big
            if (this.isTraining) {
                this.players.push(new GamePlayer("AI", p, this))
            } else if (isMultiplayer) {
                this.players.push(new GamePlayer("remote human", p))
            } else {
                this.players.push(new GamePlayer("local human", p))
            }
        }

        // playerNum.style.color = this.board.playerColours[this.playerIndex]
        this.players[this.playerIndex].pickMove(this.gameState)
    }

    // Create the board brand new
    resetGame () {

        const gameState = []

        for (let b=0; b<this.span; b++) {

            const boardGameState = []

            for (let r=0; r<this.span; r++) {

                const rowGameState = []

                for (let c=0; c<this.span; c++) {
                    rowGameState.push(" ")
                }

                boardGameState.push(rowGameState)
            }
            gameState.push(boardGameState)
        }

        if (this.board) {
            this.board.resetBoard()
            // playerNum.style.color = this.board.playerColours[this.playerIndex]
        }

        // winsDisplay.style.display = "none"
        this.gameState = gameState

        // Clear the AI players' lastState
        for (let p=0; p<this.players.length; p++) {
            if (this.players[p].type == "AI") {
                this.players[p].clearLastState()
            }
        }

        return gameState
    }

    makeMove (p, b, r, c) {

        if (p != this.playerIndex && !this.isTraining) {
            console.log("NOT your turn!")
            return
        }

        // Illegal move
        if (this.gameState[b][r][c] !== " ") {
            console.log("Illegal move")

            // Slap its hands, if it was an AI player
            this.players[p].reward(-99, this.gameState)

            // Stop the game if it's an AI, to avoid looping to stack overflow
            if (this.players[p].type=="AI") {
                this.resetGame()
            }

            return
        }

        [b, r, c] = this.applyGravityToMove(b, r, c)

        this.gameState[b][r][c] = p
        this.board.addPoint(b, r, c, p, (this.playerIndex+1) % this.players.length)

        // Player wins
        if (this.isWinningMove(b, r, c, p)) {
            this.players[p].reward(1, this.gameState)
            this.players.forEach((player, pi) => pi!=p && player.reward(-1, this.gameState))
            // winsDisplay.style.display = "inline-block"
            return
        }

        // Tied game
        if (this.isFull()) {
            console.log("Tied game")
            this.players.forEach(player => player.reward(0.25, this.gameState))
            return
        }


        // TODO, this might be useless - TEST
        this.players.forEach((player, pi) => pi!=p && player.reward(0, this.gameState))

        this.playerIndex = ++this.playerIndex % this.players.length

        // TODO, do this outside of this class?
        // playerNum.style.color = this.board.playerColours[this.playerIndex]
        // winsDisplay.style.display = "none"

        this.players[this.playerIndex].pickMove(this.gameState)
        if (ws){
            sendState(this.gameState)
        }
    }

    isWinningMove (boardIndex, tileY, tileX, player) {

        let match = false
        const max = this.gameState[0].length-1
        const mid = Math.floor(max/2)

        // Check current board
        match = this.gameState[boardIndex][tileY].every(col => col===player) // Horizontal
            ||  this.gameState[boardIndex].every(row => row[tileX]===player) // Vertical
            ||  (tileX + tileY)%2 === 0 && ( // Is it on a diagonal?
                // Diagonal top-left -> bottom-right
                this.gameState[boardIndex].every((row, ri) => row[ri]===player) ||
                // Diagonal bottom-left -> top-right
                this.gameState[boardIndex].every((row, ri) => row[max-ri]===player)
            )

        // Check other boards
        // Up/Down
        match = match || this.gameState.every(board => board[tileY][tileX] === player)

        if (match) return true

        // 3D diagonals
        // Not in location unreachable by a diagonal
        if (boardIndex !== mid || boardIndex===mid && (tileY===mid || tileX===mid)) {

            match = match
                ||  this.gameState.every((board, bi) => board[max-bi][tileX]===player) // Near-bottom -> Far-top
                ||  this.gameState.every((board, bi) => board[bi][tileX]===player) // Far-bottom -> Near-top
                ||  this.gameState.every((board, bi) => board[tileY][max-bi]===player) // Bottom-left -> Top-right
                ||  this.gameState.every((board, bi) => board[tileY][bi]===player) // Bottom-right -> Top-left


            if (match) return true

            // Check cross diagonal (going from corners through the middle)
            if (this.gameState[mid][mid][mid]===player) {

                match = match
                    ||  this.gameState.every((board, bi) => board[bi][bi]===player) // Far-bottom-left -> Near-top-right
                    ||  this.gameState.every((board, bi) => board[max-bi][bi]===player) // Near-bottom-left -> Far-top-right
                    ||  this.gameState.every((board, bi) => board[max-bi][max-bi]===player) // Near-bottom-right -> Far-top-left
                    ||  this.gameState.every((board, bi) => board[bi][max-bi]===player) // Far-bottom-right -> Near-top-left
            }
        }

        return match
    }

    isFull () {
        for (let b=0; b<this.span; b++) {
            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {
                    if (this.gameState[b][r][c] === " ") {
                        return false
                    }
                }
            }
        }

        return true
    }

    applyGravityToMove (board, row, col) {

        if (!this.gravityEnabled) return [board, row, col]

        let counts

        switch (this.gravity.axis) {
            // Up/Down
            case 0:
                counts = this.gravity.modifier==-1 ? board : this.span-1-board

                for (let i=0; i<counts; i++) {
                    if (this.gameState[board + this.gravity.modifier][row][col]===" ") {
                        board += this.gravity.modifier
                    } else {
                        break
                    }
                }
                break
            // Left/Right
            case 1:

                counts = this.gravity.modifier==-1 ? col : this.span-1-col

                for (let i=0; i<counts; i++) {
                    if (this.gameState[board][row][col + this.gravity.modifier]===" ") {
                        col += this.gravity.modifier
                    } else {
                        break
                    }
                }
                break
            // Forward/Backward
            case 2:

                counts = this.gravity.modifier==-1 ? row : this.span-1-row

                for (let i=0; i<counts; i++) {
                    if (this.gameState[board][row + this.gravity.modifier][col]===" ") {
                        row += this.gravity.modifier
                    } else {
                        break
                    }
                }
                break
        }

        return [board, row, col]
    }

    /*
        TODO, there's a bug where some points don't move as needed. I think this may be due
        to the order in which the tiles are moved
    */
    shiftGravity (direction) {

        this.gravity.axis = this.directions[direction]
        this.gravity.modifier = this.modifiers[direction]

        const max = Math.abs((this.gravity.modifier==-1 ? this.span-1 : 0)-(this.span-1))

        switch (this.gravity.axis) {

            // Up/Down (boards)
            case 0:
                // For every row
                for (let r=0; r<this.span; r++) {
                    // For every column
                    for (let c=0; c<this.span; c++) {

                        let i2 = 0

                        everyBoard:
                        for (let i=0; i<this.span; i++) {

                            if (this.gameState[Math.abs(max-i)][r][c]===" ") {

                                i2 = i+1

                                while (i2<this.span) {
                                    if (i2<this.span && i<this.span && this.gameState[Math.abs(max-i2)][r][c] !== " ") {

                                        this.board.moveSphere({b: Math.abs(max-i2), r, c}, {b: Math.abs(max-i), r, c}, "y", Math.abs(max-i))

                                        this.gameState[Math.abs(max-i)][r][c] = this.gameState[Math.abs(max-i2)][r][c]
                                        this.gameState[Math.abs(max-i2)][r][c] = " "

                                        i += i2
                                    }

                                    i2++
                                }
                                break everyBoard
                            }
                        }
                    }
                }
                break

            // Left/Right (columns)
            case 1:

                // For every board
                for (let b=0; b<this.span; b++) {
                    // For every row
                    for (let r=0; r<this.span; r++) {

                        let i2 = 0

                        everyColumn:
                        for (let i=0; i<this.span; i++) {

                            if (this.gameState[b][r][Math.abs(max-i)]===" ") {

                                i2 = i+1

                                while (i2<this.span) {
                                    if (i2<this.span && i<this.span && this.gameState[b][r][Math.abs(max-i2)]!==" ") {

                                        this.board.moveSphere({b, r, c: Math.abs(max-i2)}, {b, r, c: Math.abs(max-i)}, "x", Math.abs(max-i))

                                        this.gameState[b][r][Math.abs(max-i)] = this.gameState[b][r][Math.abs(max-i2)]
                                        this.gameState[b][r][Math.abs(max-i2)] = " "

                                        i += i2
                                    }

                                    i2++
                                }
                                break everyColumn
                            }

                        }

                    }
                }
                break

            // Forward/Backward (rows)
            case 2:

                // For every board
                for (let b=0; b<this.span; b++) {
                    // For every row
                    for (let r=0; r<this.span; r++) {

                        let i2 = 0

                        everyColumn:
                        for (let i=0; i<this.span; i++) {

                            if (this.gameState[b][Math.abs(max-i)][r]===" ") {

                                i2 = i+1

                                while (i2<this.span) {
                                    if (i2<this.span && i<this.span && this.gameState[b][Math.abs(max-i2)][r]!==" ") {

                                        this.board.moveSphere({b, r: Math.abs(max-i2), c: r}, {b, r: Math.abs(max-i), c: r}, "z", Math.abs(max-i))

                                        this.gameState[b][Math.abs(max-i)][r] = this.gameState[b][Math.abs(max-i2)][r]
                                        this.gameState[b][Math.abs(max-i2)][r] = " "

                                        i += i2
                                    }

                                    i2++
                                }
                                break everyColumn
                            }
                        }
                    }
                }

                break
        }

        this.checkAll()

        this.board.clearHighlightedBoxes()
        this.board.setPreviewColour(this.playerIndex)
    }


    // Check the game status for all placed items (when the gravity is changed, and every item is potentially re-arranged)
    // TODO, optimize this, as this is insanely inefficient
    checkAll () {
        let match = false
        let player

        for (let b=0; b<this.span; b++) {
            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {

                    if (this.gameState[b][r][c] !== " ") {
                        match = match || this.isWinningMove(b, r, c, this.gameState[b][r][c])
                        if (match) {
                            player = this.gameState[b][r][c]
                            break
                        }
                    }
                }
            }
        }


        return player


        // if (match) {
        //     playerNum.style.color = this.board.playerColours[player]
        //     winsDisplay.style.display = "inline-block"
        // } else {
        //     this.playerIndex = ++this.playerIndex % this.players.length
        //     winsDisplay.style.display = "none"
        //     playerNum.style.color = this.board.playerColours[this.playerIndex]
        // }
    }

}

typeof window!="undefined" && (window.GameLogic = GameLogic)
exports.GameLogic = GameLogic