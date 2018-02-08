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

                pos.y = (pos.b - this.SPREAD) * this.BOX_WIDTH * this.SPACING
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