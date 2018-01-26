"use strict"

const test = "stuff"

class GameBoard {

    constructor (game) {

        const {span, gameState, gravity, gravityEnabled} = game

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

                    if (gameState[b][r][c] == null) {
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
            this.boardElement.children[board].children[r*this.span + c].innerHTML = ""
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