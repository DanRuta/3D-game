"use strict"

class GameBoard {// eslint-disable-line

    constructor (game) {

        const {span, gravity, gravityEnabled} = game

        this.playerColours = ["blue", "red", "green", "purple", "yellow", "brown", "black", "cyan", "pink", "darkgrey"]
        this.rotationValue = -45
        this.tiltValue = span==3 ? 20 : span==7 ? 40 : 30
        this.span = span
        this.gravity = gravity
        this.gravityEnabled = gravityEnabled
        this.perspectiveX = 150
        this.perspectiveY = 1000
        this.boardElement = document.createElement("div")
        this.boardElement.id = "boardsContainer"

        if (this.span!=3) {
            this.boardElement.style.marginTop = "0"

            if (this.span==7) {
                this.boardElement.style.marginTop = "100px"
                this.perspectiveY = 800
            } else {
                this.perspectiveY = 1000
            }
        }

        this.boardElement.style.perspectiveOrigin = `${this.perspectiveX}px ${this.perspectiveY}px`


        for (let b=0; b<this.span; b++) {

            const board = document.createElement("div")
            const tileSize = 300/this.span

            board.className = "board"
            board.style.gridTemplateColumns = `${tileSize}px `.repeat(this.span)
            board.style.gridTemplateRows = `${tileSize}px `.repeat(this.span)
            board.style.transform = `rotateX(${this.tiltValue}deg) rotateZ(${this.rotationValue}deg)`
            board.style.marginTop = this.span==7 ? "-70%" : "-50%"

            // TODO, move this out of here
            flatArrowsContainer.style.transform = `rotateX(${this.tiltValue+30}deg) rotateZ(${this.rotationValue-45}deg)`

            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {
                    const tile = document.createElement("div")

                    tile.addEventListener("click", () => game.makeMove(game.playerIndex, b, r, c))
                    tile.addEventListener("mouseover", () => this.styleHoverPreview(b, r, c))

                    board.appendChild(tile)
                }
            }

            this.boardElement.appendChild(board)
        }

    }

    render (gameState) {
        for (let b=0; b<this.span; b++) {
            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {

                    const elem = this.boardElement.children[b].children[r*this.span + c]

                    if (gameState[b][r][c] === " ") {
                        elem.innerHTML = ""
                    } else {
                        elem.innerHTML = "•"
                        elem.style.color = this.playerColours[gameState[b][r][c]]
                    }
                }
            }
        }
    }

    addPoint (board, row, col, player) {
        this.boardElement.children[board].children[row*this.span + col].innerHTML = "•"
        this.boardElement.children[board].children[row*this.span + col].style.color = this.playerColours[player]
    }

    renderPoints () {

    }

    resetBoard () {
        for (let b=0; b<this.span; b++) {
            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {
                    this.boardElement.children[b].children[r*this.span + c].innerHTML = ""
                }
            }
        }
    }

    // Highlight the column/row/vertical-column that will be affected by a move
    styleHoverPreview (board, row, col) {

        if (!this.gravityEnabled) {
            return
        }

        // Clear last highlighted tiles
        const existingHovered = this.boardElement.querySelectorAll(".hoveredTile")
        existingHovered.forEach(tile => tile.classList.toggle("hoveredTile"))

        switch (this.gravity.axis) {
            // Up/Down
            case 0:
                for (let b=0; b<this.span; b++) {
                    this.boardElement.children[b].children[row*this.span + col].classList.toggle("hoveredTile")
                }
                break
            // Left/Right
            case 1:
                for (let c=0; c<this.span; c++) {
                    this.boardElement.children[board].children[row*this.span + c].classList.toggle("hoveredTile")
                }
                break
            // Forward/Backward
            case 2:
                for (let r=0; r<this.span; r++) {
                    this.boardElement.children[board].children[r*this.span + col].classList.toggle("hoveredTile")
                }
                break
        }

    }


    rotate () {
        Array.from(this.boardElement.children).forEach(board => {
            board.style.transform = `rotateX(${this.tiltValue}deg) rotateZ(${this.rotationValue}deg)`
            flatArrowsContainer.style.transform = `rotateX(${this.tiltValue+30}deg) rotateZ(${this.rotationValue-45}deg)`
        })
    }

}
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

        this.board = new GameBoard(this)
        playerNum.style.color = this.board.playerColours[this.playerIndex]


        // Set the first player to either AI or human (aka the actual player)
        if (this.aiOpponent) {
            this.players.push(new GamePlayer("AI", 0, this, {epsilon, alpha, gamma}))
        } else {
            this.players.push(new GamePlayer("local human", 0))
        }

        // Set the rest to whatever was configured
        for (let p=1; p<players; p++) {

            // TODO, disallow more than 1 other player when playing against AI - model needed would be too big
            if (this.isTraining) {
                this.players.push(new GamePlayer("AI", p, this, {epsilon, alpha, gamma}))
            } else if (isMultiplayer) {
                this.players.push(new GamePlayer("remote human", p))
            } else {
                this.players.push(new GamePlayer("local human", p))
            }
        }

        // Randomize who starts
        this.playerIndex = 0//Math.floor(Math.random()*players)

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
            playerNum.style.color = this.board.playerColours[this.playerIndex]
        }

        winsDisplay.style.display = "none"
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
        this.board.addPoint(b, r, c, p)

        // Player wins
        if (this.winningMove(b, r, c, p)) {
            console.log("Player wins", p)
            this.players[p].reward(1, this.gameState)
            this.players.forEach((player, pi) => pi!=p && player.reward(-1, this.gameState))
            winsDisplay.style.display = "inline-block"
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
        playerNum.style.color = this.board.playerColours[this.playerIndex]
        winsDisplay.style.display = "none"

        this.players[this.playerIndex].pickMove(this.gameState)
    }

    trainAI ({epsilon, alpha, gamma, epochs=20000}={}) {

        this.span = 3
        this.players = []
        this.players.push(new GamePlayer("AI", 0, this, {epsilon, alpha, gamma}))
        this.players.push(new GamePlayer("AI", 1, this, {epsilon, alpha, gamma}))
        this.resetGame()
        this.isTraining = true

        let totalEpochs = 0

        while (totalEpochs < epochs) {

            // Randomize who starts, to train both cases
            this.playerIndex = Math.random() < 0.5 ? 1 : 0

            this.players[this.playerIndex].pickMove(this.gameState)

            totalEpochs++
            this.resetGame()
        }

        console.log("Training finished", Object.keys(this.players[0].q).length, Object.keys(this.players[1].q).length)
        this.isTraining = false
        this.players[0] = new GamePlayer("local human", 0)
        this.players[1].epsilon = 0
        this.playerIndex = 0//Math.random() < 0.5 ? 0 : 1
        // this.players[this.playerIndex].pickMove(this.gameState)
    }

    TEMPReset () {
        this.resetGame()
        this.playerIndex = Math.random() < 0.5 ? 1 : 0
        this.players[this.playerIndex].pickMove(this.gameState)
    }

    winningMove (boardIndex, tileY, tileX, player) {

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

        /*
                Temporarily check only the first board, when training AI
        */
        if (this.isTraining || this.players[1].type == "AI") {
            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {
                    if (this.gameState[0][r][c] === " ") {
                        return false
                    }
                }
            }
            return true
        }


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

        this.board.render(this.gameState)
        this.checkAll()
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
                        match = match || this.winningMove(b, r, c, this.gameState[b][r][c])
                        if (match) {
                            player = this.gameState[b][r][c]
                            break
                        }
                    }
                }
            }
        }


        if (match) {
            playerNum.style.color = this.board.playerColours[player]
            winsDisplay.style.display = "inline-block"
        } else {
            this.playerIndex = ++this.playerIndex % this.players.length
            winsDisplay.style.display = "none"
            playerNum.style.color = this.board.playerColours[this.playerIndex]
        }
    }

}
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

        const key = state.join("").replace(/,/g,"").replace(/0/g, "X").replace(/1/g, "O") + action

        if (this.q[key]==undefined) {
            this.q[key] = 1
        }

        return this.q[key]
    }

    // TODO, include multiple boards, when the time comes
    getAvailableMoves (gameState) {
        const moves = []

        for (let r=0; r<this.game.span; r++) {
            for (let c=0; c<this.game.span; c++) {
                if (Number.isNaN(parseInt(gameState[0][r][c]))) {
                    moves.push(r*this.game.span + c)
                }
            }
        }

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
            this.game.makeMove(this.playerIndex, 0, parseInt(this.lastMove/this.game.span), this.lastMove%this.game.span)
            return
        }

        const qs = []

        for (let m=0; m<moves.length; m++) {
            qs.push(this.getQ(this.lastState, moves[m]))
        }

        const maxQ = qs.slice(0).sort().reverse()[0]

        this.lastMove = moves[qs.indexOf(maxQ)]
        this.game.makeMove(this.playerIndex, 0, parseInt(this.lastMove/this.game.span), this.lastMove%this.game.span)
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

            const key = this.lastState.join("").replace(/,/g,"").replace(/0/g, "X").replace(/1/g, "O") + this.lastMove
            this.q[key] = prev + this.alpha * (value + this.gamma * maxqNew - prev)
        }
    }

}
//# sourceMappingURL=game.concat.js.map