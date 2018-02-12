"use strict"

class GameBoard {// eslint-disable-line

    constructor (game, isVR) {

        const {span} = game

        this.playerColours = ["blue", "red", "green", "purple", "yellow", "orange", "black", "cyan", "pink", "darkgrey"]
        this.rotation = -45
        this.span = span
        this.game = game // Two way binding
        this.heightOffset = 0

        // Rendering constants
        this.BOX_WIDTH = 0.5
        this.SPREAD = Math.floor(this.span / 2)
        this.SPACING = 1.5
        this.SPHERE_RADIUS = 0.2
        this.SPHERE_V_COUNT = 50
        this.OPACITY_ON = 0.5
        this.OPACITY_OFF = 0.25

        this.explodedMult = 1
        this.isLerpingBoxes = false

        this.colours = {
            RED: 0xff0000,
            BLUE: 0x0000ff,
            GREEN: 0x00ff00,
            PURPLE: 0x880088,
            YELLOW: 0xffff00,
            ORANGE: 0xff6600,
            BLACK: 0x000000,
            CYAN: 0x00ffff,
            PINK: 0xffc0cb,
            BRIGHTGREY: 0xaaaaaa,
            LIGHTGREY: 0x999999,
            DARKGREY: 0x666666,
            WHITE: 0xffffff
        }

        // Create a render sphere to move around to the correct location
        const previewColour = this.colours[this.playerColours[this.game.playerIndex].toUpperCase()]
        const previewSphereGeometry = new THREE.SphereGeometry(this.SPHERE_RADIUS, this.SPHERE_V_COUNT, this.SPHERE_V_COUNT)
        const previewSphereMaterial = new THREE.MeshLambertMaterial({color: previewColour, transparent: true})
        previewSphereMaterial.opacity = 0
        previewSphereMaterial.emissive.setHex(previewColour)
        this.previewSphere = new THREE.Mesh(previewSphereGeometry, previewSphereMaterial)


        if (isVR) return

        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()
        this.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true})
        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.setSize(window.innerWidth-100, window.innerHeight-200)
        this.renderer.domElement.id = "rendererDomElement"
        this.boardElement = this.renderer.domElement

        const light = new THREE.DirectionalLight(this.colours.LIGHTGREY, 1)
        light.position.set(1, 1, 1).normalize()
        this.scene.add(light)

        this.camera.position.y = 2

        this.scene.add(this.previewSphere)

        this.initBoards()
        this.renderLoop()
        this.rotate()

        this.boardElement.addEventListener("mousemove", event => {
            const sizeY = event.target.height
            const sizeX = event.target.width
            this.mouse.x = event.offsetX / sizeX * 2 - 1
            this.mouse.y = -event.offsetY / sizeY * 2 + 1
        }, false)
    }

    // Create volumes to store the boxes / spheres
    initBoards () {
        this.highlightedBoxes = []
        this.boxes = [...new Array(this.span)].map(() => [...new Array(this.span)].map(() => [...new Array(this.span)]))
        this.spheres = [...new Array(this.span)].map(() => [...new Array(this.span)].map(() => [...new Array(this.span)]))

        // Populate the canvas with the board cubes
        for (let b=0; b<this.span; b++) {
            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {
                    this.addBox(b, r, c)
                }
            }
        }
    }

    addBox (b, r, c) {
        const geometry = new THREE.BoxGeometry(this.BOX_WIDTH, this.BOX_WIDTH, this.BOX_WIDTH)
        const material = new THREE.MeshLambertMaterial({color: this.colours.DARKGREY})
        material.opacity = this.OPACITY_OFF
        material.transparent = true

        const box = new THREE.Mesh(geometry, material)
        box.material.emissive.setHex(this.colours.LIGHTGREY)

        box.position.x = (c - this.SPREAD) * this.BOX_WIDTH * this.SPACING
        box.position.y = (b - this.SPREAD) * this.BOX_WIDTH * this.SPACING + this.heightOffset
        box.position.z = (r - this.SPREAD) * this.BOX_WIDTH * this.SPACING
        box.data = {b, r, c}
        box.origPos = {
            x: box.position.x,
            y: box.position.y,
            z: box.position.z
        }

        this.scene.add(box)
        this.boxes[b][r][c] = box
    }

    addSphere (b, r, c, colour) {
        const sphereGeometry = new THREE.SphereGeometry(this.SPHERE_RADIUS, this.SPHERE_V_COUNT, this.SPHERE_V_COUNT)
        const sphereMaterial = new THREE.MeshLambertMaterial({color: this.colours[colour.toUpperCase()]})
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
        sphere.material.emissive.setHex(this.colours[colour.toUpperCase()])

        sphere.position.x = (c - this.SPREAD) * this.BOX_WIDTH * this.SPACING
        sphere.position.y = (b - this.SPREAD) * this.BOX_WIDTH * this.SPACING + this.heightOffset
        sphere.position.z = (r - this.SPREAD) * this.BOX_WIDTH * this.SPACING
        sphere.origPos = {
            x: sphere.position.x,
            y: sphere.position.y,
            z: sphere.position.z
        }

        // Set the sphere position to the exploded position
        if (this.explodedMult!=1) {
            sphere.position.x += sphere.origPos.x * this.explodedMult - sphere.position.x
            sphere.position.y += sphere.origPos.y * this.explodedMult - sphere.position.y
            sphere.position.z += sphere.origPos.z * this.explodedMult - sphere.position.z
        }

        this.spheres[b][r][c] = sphere
        this.scene.add(sphere)
    }

    clearHighlightedBoxes () {
        for (let b=0; b<this.highlightedBoxes.length; b++) {
            this.highlightedBoxes[b].material.opacity = this.OPACITY_OFF
            this.highlightedBoxes[b].material.emissive.setHex(this.colours.LIGHTGREY)
        }
        this.highlightedBoxes = []
        this.previewSphere.material.opacity = 0
    }

    highlightColumn ({r, c}) {
        for (let b=0; b<this.span; b++) {
            this.boxes[b][r][c].material.opacity = this.OPACITY_ON
            this.boxes[b][r][c].material.emissive.setHex(this.colours.DARKGREY)
            this.highlightedBoxes.push(this.boxes[b][r][c])
        }
    }

    highlightRowY ({b, r}) {
        for (let c=0; c<this.span; c++) {
            this.boxes[b][r][c].material.opacity = this.OPACITY_ON
            this.boxes[b][r][c].material.emissive.setHex(this.colours.DARKGREY)
            this.highlightedBoxes.push(this.boxes[b][r][c])
        }
    }

    highlightRowX ({b, c}) {
        for (let r=0; r<this.span; r++) {
            this.boxes[b][r][c].material.opacity = this.OPACITY_ON
            this.boxes[b][r][c].material.emissive.setHex(this.colours.DARKGREY)
            this.highlightedBoxes.push(this.boxes[b][r][c])
        }
    }

    getPreviewPosition (cube) {

        const incr = this.game.gravity.modifier
        const pos = {
            x : cube.origPos.x,
            y : cube.origPos.y,
            z : cube.origPos.z
        }

        pos.b = cube.data.b
        pos.r = cube.data.r
        pos.c = cube.data.c

        if (!this.game.gravityEnabled) {
            return pos
        }

        switch (this.game.gravity.axis) {
            // up/down
            case 0:
                // Column full
                if (this.spheres[incr==-1 ? this.span-1 : 0][cube.data.r][cube.data.c]) {
                    return null
                }

                pos.b = incr==-1 ? 0 : this.span-1

                while (this.spheres[pos.b][cube.data.r][cube.data.c]) {
                    pos.b -= incr
                }

                pos.y = (pos.b - this.SPREAD) * this.BOX_WIDTH * this.SPACING + this.heightOffset
                break

            // left/right
            case 1:
                // Row full
                if (this.spheres[cube.data.b][cube.data.r][incr==-1 ? this.span-1 : 0]) {
                    return null
                }

                pos.c = incr==-1 ? 0 : this.span-1

                while (this.spheres[cube.data.b][cube.data.r][pos.c]) {
                    pos.c -= incr
                }

                pos.x = (pos.c - this.SPREAD) * this.BOX_WIDTH * this.SPACING
                break
            // forward/backward
            case 2:
                // Row full
                if (this.spheres[cube.data.b][incr==-1 ? this.span-1 : 0][cube.data.c]) {
                    return null
                }

                pos.r = incr==-1 ? 0 : this.span-1

                while (this.spheres[cube.data.b][pos.r][cube.data.c]) {
                    pos.r -= incr
                }

                pos.z = (pos.r - this.SPREAD) * this.BOX_WIDTH * this.SPACING
                break
        }

        if (this.explodedMult!=1) {
            pos.x *= this.explodedMult
            pos.y *= this.explodedMult
            pos.z *= this.explodedMult
        }

        // Don't render it if there's already a sphere at that location
        if (this.spheres[pos.b][pos.r][pos.c]) {
            return null
        }

        return pos
    }

    moveSphere (start, end, axis, location) {

        // Set the new position for the sphere
        const sphere = this.spheres[start.b][start.r][start.c]
        sphere.isLerping = true
        sphere.newPos = {}
        sphere.newPos.axis = axis
        sphere.newPos[axis] = (location - this.SPREAD) * this.BOX_WIDTH * this.SPACING

        // Move the spheres in the spheres state
        this.spheres[end.b][end.r][end.c] = sphere
        this.spheres[start.b][start.r][start.c] = null
    }

    // Lerp the boxes into position, when exploded
    lerpBoxes () {
        if (this.isLerpingBoxes) {
            for (let b=0; b<this.span; b++) {
                for (let r=0; r<this.span; r++) {
                    for (let c=0; c<this.span; c++) {

                        if (b!=this.SPREAD && r!=this.SPREAD && c!=this.SPREAD
                            && Math.abs(this.boxes[b][r][c].position.x - this.boxes[b][r][c].origPos.x * this.explodedMult) < 0.005) {

                            this.isLerpingBoxes = false
                            this.boxes[b][r][c].position.x = this.boxes[b][r][c].origPos.x * this.explodedMult
                            this.boxes[b][r][c].position.y = this.boxes[b][r][c].origPos.y * this.explodedMult
                            this.boxes[b][r][c].position.z = this.boxes[b][r][c].origPos.z * this.explodedMult

                            if (this.spheres[b][r][c]) {
                                this.spheres[b][r][c].position.x += this.spheres[b][r][c].origPos.x * this.explodedMult - this.spheres[b][r][c].position.x
                                this.spheres[b][r][c].position.y += this.spheres[b][r][c].origPos.y * this.explodedMult - this.spheres[b][r][c].position.y
                                this.spheres[b][r][c].position.z += this.spheres[b][r][c].origPos.z * this.explodedMult - this.spheres[b][r][c].position.z
                            }

                        } else {
                            this.boxes[b][r][c].position.x += (this.boxes[b][r][c].origPos.x * this.explodedMult - this.boxes[b][r][c].position.x) / 10
                            this.boxes[b][r][c].position.y += (this.boxes[b][r][c].origPos.y * this.explodedMult - this.boxes[b][r][c].position.y) / 10
                            this.boxes[b][r][c].position.z += (this.boxes[b][r][c].origPos.z * this.explodedMult - this.boxes[b][r][c].position.z) / 10

                            if (this.spheres[b][r][c]) {
                                this.spheres[b][r][c].position.x += (this.spheres[b][r][c].origPos.x * this.explodedMult - this.spheres[b][r][c].position.x) / 10
                                this.spheres[b][r][c].position.y += (this.spheres[b][r][c].origPos.y * this.explodedMult - this.spheres[b][r][c].position.y) / 10
                                this.spheres[b][r][c].position.z += (this.spheres[b][r][c].origPos.z * this.explodedMult - this.spheres[b][r][c].position.z) / 10
                            }
                        }
                    }
                }
            }
        }
    }

    // Lerp the spheres into their new place
    lerpSpheres () {

        this.someSphereIsLerping = false

        for (let b=0; b<this.span; b++) {
            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {

                    if (this.spheres[b][r][c] && this.spheres[b][r][c].isLerping) {

                        this.someSphereIsLerping = true

                        const sphere = this.spheres[b][r][c]
                        const {axis} = sphere.newPos

                        if (Math.abs(sphere.position[axis] - sphere.newPos[axis] * this.explodedMult) > 0.01) {
                            sphere.position[axis] += (sphere.newPos[axis] * this.explodedMult - sphere.position[axis]) / 10
                        } else {
                            sphere.isLerping = false
                            sphere.position[axis] = sphere.newPos[axis] * this.explodedMult
                            sphere.origPos[axis] = sphere.newPos[axis]
                        }
                    }
                }
            }
        }
    }

    renderLoop () {

        requestAnimationFrame(() => this.renderLoop())
        this.lerpBoxes()
        this.lerpSpheres()

        this.camera.lookAt(this.scene.position)
        this.camera.updateMatrixWorld()

        this.renderer.render(this.scene, this.camera)
        this.raycaster.setFromCamera(this.mouse, this.camera)

        const intersects = this.raycaster.intersectObjects(this.scene.children, true)

        if (intersects.length) {

            // If still hovering on the same thing...
            if (this.hoveredObject && (this.hoveredObject==intersects[0].object || this.hoveredObject==intersects[0].object.parent)) {

                if (this.mouseIsDown && !this.hoveredObject.data.isClicked) {
                    this.hoveredObject.data.isClicked = true
                    setTimeout(() => {
                        if (this.hoveredObject) {
                            this.hoveredObject.data.isClicked = false
                        }
                    }, 500)

                    const {b, r, c} = this.previewSphere.data

                    if (this.game.gameState[b][r][c]===" ") {
                        if (ws){
                            sendMove(this.game.playerIndex, b, r, c, this.game.gameState)
                        } else {
                            this.game.makeMove(this.game.playerIndex, b, r, c)
                        }
                    }
                }

            } else {

                // Set the currently hovered over object
                this.hoveredObject = intersects[0].object.data ? intersects[0].object : intersects[0].object.parent
                this.clearHighlightedBoxes()

                if (this.hoveredObject.data) {
                    // Also TODO, decide which one of these to do, based on the current gravity

                    if (!this.isLerpingBoxes && !this.someSphereIsLerping) {

                        if (this.game.gravityEnabled) {
                            switch (this.game.gravity.axis) {
                                case 0:
                                    this.highlightColumn(this.hoveredObject.data)
                                    break
                                case 1:
                                    this.highlightRowY(this.hoveredObject.data)
                                    break
                                case 2:
                                    this.highlightRowX(this.hoveredObject.data)
                                    break
                            }
                        } else {
                            // Highlight only the hovered over box
                            const {b, r, c} = this.hoveredObject.data
                            this.boxes[b][r][c].material.opacity = this.OPACITY_ON
                            this.boxes[b][r][c].material.emissive.setHex(this.colours.DARKGREY)
                            this.highlightedBoxes.push(this.boxes[b][r][c])
                        }

                        // Render the preview sphere at the correct location
                        const pos = this.getPreviewPosition(this.hoveredObject)

                        if (pos) {
                            this.previewSphere.position.x = pos.x
                            this.previewSphere.position.y = pos.y
                            this.previewSphere.position.z = pos.z
                            this.previewSphere.data = {
                                b: pos.b,
                                r: pos.r,
                                c: pos.c
                            }
                            this.previewSphere.material.opacity = 0.5
                        }
                        // === ?
                        // else {
                        //     this.previewSphere.material.opacity = 0
                        // }
                    }
                }
            }

        } else {

            this.clearHighlightedBoxes()
            this.previewSphere.material.opacity = 0

            if (this.hoveredObject) {
                if (this.hoveredObject.material) {
                    this.hoveredObject.material.emissive.setHex(this.colours.LIGHTGREY)
                    this.hoveredObject.material.opacity = this.OPACITY_OFF
                    this.hoveredObject.data.isClicked = false
                } else if (this.hoveredObject.parent) {
                    this.hoveredObject.parent.material.emissive.setHex(this.colours.LIGHTGREY)
                    this.hoveredObject.parent.material.opacity = this.OPACITY_OFF
                    this.hoveredObject.parent.data.isClicked = false
                }

            }
            this.hoveredObject = null
        }
    }

    toggleExploded () {
        this.explodedMult = this.explodedMult==1 ? 2 : 1
        this.previewSphere.material.opacity = 0
        this.isLerpingBoxes = true
    }

    addPoint (board, row, col, player, nextPlayer) {
        this.addSphere(board, row, col, this.playerColours[player].toUpperCase())
        this.previewSphere.material.opacity = 0

        if (nextPlayer!==undefined) {
            this.setPreviewColour(nextPlayer)
        }
    }

    setPreviewColour (playerIndex) {
        const previewColour = this.colours[this.playerColours[playerIndex].toUpperCase()]
        this.previewSphere.material.color.setHex(previewColour)
        this.previewSphere.material.emissive.setHex(previewColour)
    }

    highlightArrow (index) {
        const arrowModel = arrowModels.filter(a => a.data.arrowIndex==index)

        // Clear old arrow
        if (clickedObject) {
            clickedObject.children.forEach(c => c.material.emissive.setHex(this.colours.BRIGHTGREY))
        }

        // Set new one to cyan
        arrowModel[0].children.forEach(c => c.material.emissive.setHex(this.colours.CYAN))
        clickedObject = arrowModel[0]
    }

    render (gameState) {
        this.resetBoard()

        for (let b=0; b<this.span; b++) {
            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {
                    if (!Number.isNaN(parseInt(gameState[b][r][c]))) {
                        this.addPoint(b, r, c, gameState[b][r][c])
                    }
                }
            }
        }
    }

    resetBoard () {
        for (let b=0; b<this.span; b++) {
            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {
                    if (this.spheres[b][r][c]) {
                        this.scene.remove(this.spheres[b][r][c])
                        this.spheres[b][r][c] = undefined
                    }
                }
            }
        }
    }

    rotate () {
        this.camera.position.x = Math.sin(this.rotation*Math.PI/180) * (this.BOX_WIDTH * 1.5) * this.span * 2
        this.camera.position.z = Math.cos(this.rotation*Math.PI/180) * (this.BOX_WIDTH * 1.5) * this.span * 2
    }

}

typeof window!="undefined" && (window.exports = window.exports || {})
"use strict"

class GamePlayer {// eslint-disable-line

    constructor (type, playerIndex, game, name) {

        console.log(`new ${type} player: ${playerIndex}`)

        this.type = type
        this.game = game // Two way binding
        this.playerIndex = playerIndex
        this.name = name
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
"use strict"

class GameLogic {// eslint-disable-line

    constructor ({gameState, gameBoard, gravityEnabled=true, span=3, players=2, isTraining, isMultiplayer, aiOpponent, isVR}={}) {

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
        this.board = new gameBoard(this, isVR)

        // Set the first player to either AI or human (aka the actual player)
        if (this.aiOpponent) {
            this.players.push(new GamePlayer("AI", 0, this, "AI"))
        } else {
            this.players.push(new GamePlayer("local human", 0, undefined ,"Player 1"))
        }

        // Set the rest to whatever was configured
        for (let p=1; p<players; p++) {

            // TODO, disallow more than 1 other player when playing against AI - model needed would be too big
            if (this.isTraining) {
                this.players.push(new GamePlayer("AI", p, this))
            } else if (isMultiplayer) {
                this.players.push(new GamePlayer("remote human", p, undefined, `Player ${p +1}`))
            } else {
                this.players.push(new GamePlayer("local human", p, undefined, `Player ${p + 1}`))
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
            window.dispatchEvent(new CustomEvent("T^3Win", {detail: p}))
            return
        }

        // Tied game
        if (this.isFull()) {
            console.log("Tied game")
            this.players.forEach(player => player.reward(0.25, this.gameState))
            window.dispatchEvent(new CustomEvent("T^3Tie", {detail: p}))
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

typeof window!="undefined" && (window.exports = window.exports || {})
typeof window!="undefined" && (window.GameLogic = GameLogic)
exports.GameLogic = GameLogic
"use strict"

class VRGameBoard extends GameBoard {// eslint-disable-line

    constructor (game) {
        super(game, true)

        this.arrowNames = ["left", "right", "up", "down", "forward", "backward"]
        this.arrowModels = []
    }

    loadTHREEjsItems (items) {
        this.scene = items.scene
        this.camera = items.camera
        this.raycaster = items.raycaster
        this.mouse = items.mouse
        this.renderer = items.renderer
        this.boardElement = items.boardElement

        this.heightOffset = 0.5
        this.scene.add(this.previewSphere)

        this.initBoards()
        this.renderLoop()
        this.rotate()

        this.boardElement.addEventListener("mousemove", event => {
            const sizeY = event.target.height
            const sizeX = event.target.width
            this.mouse.x = event.offsetX / sizeX * 2 - 1
            this.mouse.y = -event.offsetY / sizeY * 2 + 1
        }, false)
    }

    // Add arrow models
    makeArrows () {

        const loader = new THREE.ObjectLoader()

        // Don't re-draw them
        if (!this.arrowModels.length) {
            for (let a=0; a<6; a++) {
                loader.load("arrows", model => {

                    model.position.x = positions[a].x * 2 * Math.PI
                    model.position.y = positions[a].y * 2 * Math.PI
                    model.position.z = positions[a].z * 2 * Math.PI

                    model.rotation.x = rotations[a].x * 2 * Math.PI
                    model.rotation.y = rotations[a].y * 2 * Math.PI
                    model.rotation.z = rotations[a].z * 2 * Math.PI

                    model.children.forEach(c => {
                        if (a==3) {
                            c.material.emissive.setHex(this.colours.CYAN)
                            this.clickedObject = model
                        } else {
                            c.material.emissive.setHex(this.colours.BRIGHTGREY)
                        }
                    })

                    this.arrowModels.push(model)
                    model.data = {arrowIndex: a}
                    this.scene.add(model)
                })
            }
        }
    }

    highlightArrow (index) {

        const arrowModel = this.arrowModels.filter(a => a.data.arrowIndex==index)

        // Clear old arrow
        if (this.clickedObject) {
            this.clickedObject.children.forEach(c => c.material.emissive.setHex(this.colours.BRIGHTGREY))
        }

        // Set new one to cyan
        arrowModel[0].children.forEach(c => c.material.emissive.setHex(this.colours.CYAN))
        this.clickedObject = arrowModel[0]
    }

    renderLoop () {

        requestAnimationFrame(() => this.renderLoop())

        this.lerpBoxes()
        this.lerpSpheres()

        const intersects = this.raycaster.intersectObjects(this.scene.children, true)

        if (intersects.length) {

            if (this.hoveredObject && this.hoveredObject.type=="Scene") {

                document.body.style.cursor = "pointer"

                if (this.hoveredObject == this.clickedObject) {
                    // do nothing
                } else {

                    if (this.mouseIsDown) {

                        this.highlightArrow(this.hoveredObject.data.arrowIndex)

                        console.log("clicked", this.arrowNames[this.clickedObject.data.arrowIndex])

                        if (ws) {
                            ws.send(JSON.stringify({
                                direction: this.arrowNames[this.clickedObject.data.arrowIndex],
                                userId: "1234",
                                username: "rob",
                                type: "text",
                                room: roomNameValue,
                                type: "gravity"
                            }))
                        } else {
                            this.game.shiftGravity(this.arrowNames[this.clickedObject.data.arrowIndex])
                        }

                    } else {
                        // Hovering over non clicked item without the mouse down
                        this.arrowModels.forEach(arrow => {
                            if (arrow != this.clickedObject) {
                                arrow.children.forEach(c => c.material.emissive.setHex(this.colours.BRIGHTGREY))
                            }
                        })

                        if (this.hoveredObject != this.clickedObject) {
                            this.hoveredObject.children.forEach(c => c.material.emissive.setHex(this.colours.YELLOW))
                        }
                    }
                }


            } else {

                // If still hovering on the same thing...
                if (this.hoveredObject && (this.hoveredObject==intersects[0].object || this.hoveredObject==intersects[0].object.parent)) {


                    if (this.mouseIsDown && !this.hoveredObject.data.isClicked) {
                        this.hoveredObject.data.isClicked = true
                        setTimeout(() => {
                            if (this.hoveredObject) {
                                this.hoveredObject.data.isClicked = false
                            }
                        }, 500)

                        const {b, r, c} = this.previewSphere.data

                        if (this.game.gameState[b][r][c]===" ") {
                            if (ws){
                                sendMove(this.game.playerIndex, b, r, c, this.game.gameState)
                            } else {
                                this.game.makeMove(this.game.playerIndex, b, r, c)
                            }
                        }
                    }

                } else {

                    // Set the currently hovered over object
                    this.hoveredObject = intersects[0].object.data ? intersects[0].object : intersects[0].object.parent
                    this.clearHighlightedBoxes()

                    if (this.hoveredObject.data && this.hoveredObject.type!="Scene") {
                        // Also TODO, decide which one of these to do, based on the current gravity

                        if (!this.isLerpingBoxes && !this.someSphereIsLerping) {

                            if (this.game.gravityEnabled) {
                                if (this.hoveredObject.data) {
                                    switch (this.game.gravity.axis) {
                                        case 0:
                                            this.highlightColumn(this.hoveredObject.data)
                                            break
                                        case 1:
                                            this.highlightRowY(this.hoveredObject.data)
                                            break
                                        case 2:
                                            this.highlightRowX(this.hoveredObject.data)
                                            break
                                    }
                                }
                            } else {
                                // Highlight only the hovered over box
                                const {b, r, c} = this.hoveredObject.data
                                this.boxes[b][r][c].material.opacity = this.OPACITY_ON
                                this.boxes[b][r][c].material.emissive.setHex(this.colours.DARKGREY)
                                this.highlightedBoxes.push(this.boxes[b][r][c])
                            }

                            // Render the preview sphere at the correct location
                            const pos = this.getPreviewPosition(this.hoveredObject)

                            if (pos) {
                                this.previewSphere.position.x = pos.x
                                this.previewSphere.position.y = pos.y
                                this.previewSphere.position.z = pos.z
                                this.previewSphere.data = {
                                    b: pos.b,
                                    r: pos.r,
                                    c: pos.c
                                }
                                this.previewSphere.material.opacity = 0.5
                            }
                            // === ?
                            // else {
                            //     this.previewSphere.material.opacity = 0
                            // }
                        }
                    }
                }
            }

        } else {

            if (this.hoveredObject && this.hoveredObject.type=="Scene") {

                document.body.style.cursor = "default"

                if (this.arrowModels.length) {
                    this.arrowModels.forEach(arrow => {

                        if (arrow != this.clickedObject) {
                            arrow.children.forEach(c => c.material.emissive.setHex(this.colours.BRIGHTGREY))
                        }
                    })
                }

            } else {

                this.clearHighlightedBoxes()
                this.previewSphere.material.opacity = 0

                if (this.hoveredObject) {
                    if (this.hoveredObject.material) {
                        this.hoveredObject.material.emissive.setHex(this.colours.LIGHTGREY)
                        this.hoveredObject.material.opacity = this.OPACITY_OFF
                        this.hoveredObject.data.isClicked = false
                    } else if (this.hoveredObject.parent && this.hoveredObject.parent.material) {
                        this.hoveredObject.parent.material.emissive.setHex(this.colours.LIGHTGREY)
                        this.hoveredObject.parent.material.opacity = this.OPACITY_OFF
                        this.hoveredObject.parent.data.isClicked = false
                    }

                }
            }


            this.hoveredObject = null
        }

    }

    rotate () {

    }

}
"use strict"

let ws
let roomNameValue

let rotation = 45

const rotations = [
    {x: 0.25, y: 0.0, z: 0}, // left
    {x: 0.25, y: 0.50, z: 0}, // right
    {x: 0.25, y: 0.75, z: 0}, // up
    {x: 0.25, y: 0.25, z: 0}, // down
    {x: 0.25, y: 0.50, z: 0.25}, // forward
    {x: 0.25, y: 0.50, z: 0.75} // backward
]
const positions = [
    {x: -0.125, y: -0.4, z: 0}, // left
    {x: 0.125, y: -0.4, z: 0}, // right
    {x: 0, y: -0.3, z: 0}, // up
    {x: 0, y: -0.5, z: 0}, // down
    {x: 0, y: -0.4, z: -0.125}, // forward
    {x: 0, y: -0.4, z: 0.125} // backward
]

window.getParameters = () => {

    const parameters = {}

    // Pull query parameters from url
    const parametersString = location.search.substring(1)

    if (parametersString.length) {
        parametersString.split("&").forEach(p => {
            const [k,v] =  p.split("=")
            parameters[k] = v
        })
    }

    return parameters
}


window.addEventListener("load", () => {

    // Prevent the device from going into sleep mode, to keep the screen turned on
    screen.keepAwake = true

    // Initialise THREEjs components, starting with the renderer
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true})
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    renderer.domElement.addEventListener("click", () => {
        new NoSleep().enable()

        if (!window.location.href.includes("localhost")) {
            document.fullscreenEnabled && renderer.domElement.requestFullScreen() ||
            document.webkitFullscreenEnabled && renderer.domElement.webkitRequestFullScreen() ||
            document.mozFullScreenEnabled && renderer.domElement.mozRequestFullScreen() ||
            document.msFullScreenEnabled && renderer.domElement.msRequestFullScreen()
        }
    })

    let effect = new THREE.VREffect(renderer)
    effect.separation = -10
    effect.setSize(window.innerWidth, window.innerHeight)

    let vrDisplay
    if (navigator.getVRDisplays) {
        navigator.getVRDisplays().then(displays => displays.length && (vrDisplay = displays[0]))
    }


    // Button to enable VR mode
    enterVRButton.addEventListener("click", () => {

        // Go back to non VR mode
        if (enterVRButton.classList.contains("small")) {
            effect = new THREE.VREffect(renderer)
            effect.separation = 0
            effect.setSize(window.innerWidth, window.innerHeight)

            enterVRButton.classList.remove("small")
            game.board.usingVR = false
        } else {
            // Start VR mode
            if (navigator.userAgent.includes("Mobile VR")) {
                vrDisplay.requestPresent([{source: renderer.domElement}])
            } else {
                effect = new THREE.StereoEffect(renderer)
                effect.separation = 0
                effect.setSize(window.innerWidth, window.innerHeight)
            }
            game.board.usingVR = true

            enterVRButton.classList.add("small")
        }
    })

    // Scenes and camera
    const fov = 70
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 1000)
    scene.add(camera)
    camera.rotation.order = "YXZ"
    camera.position.z = 4
    camera.position.y = 2

    // Controls
    let controls = new THREE.OrbitControls(camera, renderer.domElement)
    controls.target.set(
        Math.cos(camera.position.x*Math.PI/180) * 4,
        camera.position.y,
        Math.sin(camera.position.z*Math.PI/180) * 4
    )
    controls.enablePan = false
    controls.enableZoom = false

    // Set VR controls if available
    const setOrientationControls = event => {

        if (!event.alpha) return

        controls = new THREE.VRControls(camera)
        controls.update()

        window.removeEventListener("deviceorientation", setOrientationControls)
    }
    window.addEventListener("deviceorientation", setOrientationControls)


    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const light = new THREE.DirectionalLight( 0xffffff, 0.5 )
    light.position.set( 0, 1, 0 ).normalize()
    scene.add(light)

    const resetGame = () => {

        const {g, span, p} = getParameters()

        window.game = new GameLogic({
            gravityEnabled: !g || g=="1",
            gameBoard: VRGameBoard,
            span: parseInt(span) || 3,
            players: parseInt(p) || 2,
            isVR: true
        })
        game.board.loadTHREEjsItems({
            scene: scene,
            camera: camera,
            raycaster: raycaster,
            mouse: mouse,
            renderer: renderer,
            boardElement: renderer.domElement
        })
        game.board.makeArrows()
        roomNameValue = getURLParameter("roomName")

        if (roomNameValue !== "") {
            connectWebSockets(roomNameValue)
            //roomNameTitle.innerText = roomNameValue
        }
    }
    resetGame()

    const render = () => {

        requestAnimationFrame(render)
        controls.update()

        camera.lookAt(scene.position)
        camera.updateMatrixWorld()
        raycaster.setFromCamera(mouse, camera)

        effect.render(scene, camera)

    }
    render()


    const setRotation = rotation => {
        camera.position.x = Math.cos(rotation*Math.PI/180) * 5
        camera.position.z = Math.sin(rotation*Math.PI/180) * 5
    }
    setRotation(rotation=-45)

    renderer.domElement.addEventListener("wheel", ({deltaY}) => {
        rotation = (rotation + (deltaY > 0 ? 1 : -1) * 5) % 360
        setRotation(rotation)
    })

    document.addEventListener("mousedown", () => {
        game.board.mouseIsDown = true
    })

    document.addEventListener("mouseup", () => {
        game.board.mouseIsDown = false
    })

    document.addEventListener("click", () => {
        game.board.mouseIsDown = false
    })

    window.addEventListener("keydown", e => {
        if (e.code == "Space") {
            game.board.toggleExploded()
        }
    })


    /* MOTION CONTROLLER*/
    let getVideoFeedAttempts = 0

    const getVideoFeed = () => {
        try {
            if ("mozGetUserMedia" in navigator) {
                navigator.mozGetUserMedia(
                    {video: { facingMode: "environment" }},
                    stream => {
                        video.src = window.URL.createObjectURL(stream)
                    },
                    err => {
                        console.log(err)
                        alert("There was an error accessing the camera. Please try again and ensure you are using https")
                    }
                )
            } else {
                const mediaDevicesSupport = navigator.mediaDevices && navigator.mediaDevices.getUserMedia

                if (mediaDevicesSupport) {
                    navigator.mediaDevices
                    .getUserMedia({ video: { facingMode: "environment" } })
                    .then(stream => {
                        video.src = window.URL.createObjectURL(stream)
                    })
                    .catch(err => {
                        console.log(err)
                        getVideoFeedAttempts++

                        // Sometimes, getting the camera can fail. Re-attempting usually works, on refresh. This simulates that.
                        if (getVideoFeedAttempts<3) {
                            getVideoFeed()
                        } else {
                            alert("There was an error accessing the camera. Please try again and ensure you are using https")
                        }
                    })
                } else {
                    const getUserMedia =
                        navigator.getUserMedia ||
                        navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia ||
                        navigator.msGetUserMedia

                    if (getUserMedia) {
                        getUserMedia(
                            { video: { facingMode: "environment" } },
                            stream => {
                                video.src = window.URL.createObjectURL(stream)
                            },
                            err => {
                                console.log(err)
                                alert("There was an error accessing the camera. Please try again and ensure you are using https.")
                            }
                        )
                    } else {
                        alert("Camera not available")
                    }
                }
            }

        } catch (e) {
            alert("Error getting camera feed. Please ensure you are using https.")
        }
    }

    window.video = document.createElement("video")
    video.autoplay = true
    video.width = window.innerWidth
    video.height = window.innerHeight / 2
    getVideoFeed()

    const buffer = document.createElement("canvas")
    buffer.width = video.width
    buffer.height = video.height
    const bufferC = buffer.getContext("2d")

    let lastX = 0
    let lastY = 0

    let newX = 0
    let newY = 0

    const bounds = 100
    let foundWithinBounds = false

    let frameCounter = -1

    const moveCursor = (x, y) => {

        // console.log(x, y)
        tempCursor.style.marginTop = parseInt(y/video.height * window.innerHeight)+"px"
        let leftM = parseInt(x/video.width * window.innerWidth)

        if (game.board.usingVR) {
            leftM = leftM / 2
        }

        tempCursor.style.marginLeft = leftM+"px"

        game.board.mouse.x = x / video.width * 2 - 1
        game.board.mouse.y = (y / video.height * 2 - 1) * -1
    }

    window.readCircle = () => {

        requestAnimationFrame(readCircle)

        // Only read a new position every 10 frames
        if (++frameCounter%5==0) {

            bufferC.drawImage(video, 0, 0, video.width, video.height)
            const {data} = bufferC.getImageData(0, 0, video.width, video.height)

            let avgX = 0
            let avgY = 0
            let counter = 0

            let startR = 0
            let startC = 0
            let endR = video.height
            let endC = video.width

            // Limit the search area when the position can be roughly estimated from the previous frame
            if (foundWithinBounds) {
                startR = parseInt(Math.max(lastY - bounds, 0))
                startC = parseInt(Math.max(lastX - bounds, 0))
                endR = parseInt(Math.min(lastY + bounds, video.width))
                endC = parseInt(Math.min(lastX + bounds, video.height))
            }

            // For every 4th row
            for (let r=startR; r<endR; r+=4) {
                // For every 4th column
                for (let c=startC; c<endC; c+=4) {

                    // Pixel coords
                    const p = r*video.width + c
                    const pixel = [data[p*4]/255, data[p*4+1]/255, data[p*4+2]/255]

                    if (pixel[0]<=0.75 && pixel[1] >= 0.75 && pixel[2]<=0.7) {
                        counter++
                        avgX += c
                        avgY += r
                    }
                }
            }

            if (counter>10) {
                newX = avgX / counter
                newY = avgY / counter
                foundWithinBounds = true
            } else {
                foundWithinBounds = false
            }
        }

        lastX += (newX-lastX)/20
        lastY += (newY-lastY)/20

        moveCursor(lastX, lastY)
    }

    // TEMP
    if (getParameters().t == "y") {
        readCircle()
    }

    // Resize the rendered element on window resize
    window.addEventListener("resize", () => {
        effect.setSize(window.innerWidth, window.innerHeight)
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
    })

    window.addEventListener("T^3Win", displayWinner)
    window.addEventListener("T^3Tie", displayTie)
})


function displayWinner (e) {
    winPanel.style.display = "block"
    winPanel.style.textAlign = "center"
    winPanel.innerText = game.players[e.detail].name + " Winns!"

}

function displayTie (e) {
    winPanel.style.display = "block"
    winPanel.style.textAlign = "center"
    winPanel.innerText = game.players[e.detail].name + " Caused a tie!"
}

function connectWebSockets(roomName) {

    ws =  new WebSocket("ws://vrscrible.localhost:8000/" + roomName)

    ws.addEventListener("message", (message) => {
        const data = JSON.parse(message.data)
        console.log(data)

        if (data.type === "gravity") {
            game.shiftGravity(data.direction)

        } else if (data.type === "move") {

            const player = data.playerIndex
            const {b, r, c} = data
            console.log(player, b, r, c)
            game.makeMove(player, b, r, c)
        }
    })

    ws.addEventListener("open", () => {
        console.log("connect ws")
        console.log(roomName)
        ws.send(JSON.stringify({userId: "1234", username: "rob", type: "setUp", room: roomName }))

        getGameState(roomName)
    })
}

function getURLParameter(name) {
    // https://stackoverflow.com/questions/11582512/how-to-get-url-parameters-with-javascript
    return decodeURIComponent((new RegExp("[?|&]" + name + "=" + "([^&;]+?)(&|#|;|$)").exec(location.search) || [null, ""])[1].replace(/\+/g, "%20")) || null
}

function sendMove(playerIndex, b, r, c, gameState) {
    if (ws){
        ws.send(JSON.stringify({
            playerIndex: playerIndex,
            b: b,
            r: r,
            c: c,
            userId: "1234",
            username: "rob",
            room: roomNameValue,
            type: "move",
            gameState: gameState
        }))
    }
    //setPlayerLabels()
}

function sendState(gameState) {
    if (ws){
        ws.send(JSON.stringify({
            room: roomNameValue,
            type: "state",
            gameState: gameState
        }))
    }
}

function saveGameState(roomName, gameState) {
    fetch("./saveGameState", {
        method: "post",
        body: JSON.stringify({roomName: roomName, gameState: gameState})
    })
}

function getGameState(roomName) {

    fetch("./getGameState?roomName=" + roomName, {
        method: "get",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    }).then(res => res.json())
    .then(data => {
        if (data.gameState !== null){
            game.board.render(data.gameState)
            game.gameState  = data.gameState
        }
    })
}
//# sourceMappingURL=scriptVR.concat.js.map