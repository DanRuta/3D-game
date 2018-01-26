"use strict"

const test = "stuff"

class GameBoard {

    constructor ({span, gameState, makeMove, gravity, gravityEnabled}) {

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

                    tile.addEventListener("click", () => makeMove(b, c, r))
                    tile.addEventListener("mouseover", () => this.styleHoverPreview(b, r, c))

                    board.appendChild(tile)
                }
            }

            this.boardElement.appendChild(board)
        }

    }

    renderBoard () {

    }

    getAvailableMoves () {

    }

    renderPoints () {

    }

    // Highlight the column/row/vertical-column that will be affected by a move
    styleHoverPreview (board, row, col) {

        if (!this.gravityEnabled) return

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
"use strict"

class GamePlayer {

    constructor (type, playerIndex) {

        console.log(`new ${type} player: ${playerIndex}`)

        this.type = type
    }

    getQ () {

    }

    pickMove () {

        if (this.type != "AI") return

    }

    reward () {

        if (this.type != "AI") return

    }

}
//# sourceMappingURL=game.concat.js.map