"use strict"

class GameBoard {// eslint-disable-line

    constructor (game) {

        const {span, gravity, gravityEnabled} = game

        this.playerColours = ["blue", "red", "green", "purple", "yellow", "orange", "black", "cyan", "pink", "darkgrey"]
        this.rotation = -45
        this.span = span
        this.gravity = gravity
        this.gravityEnabled = gravityEnabled

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
            LIGHTGREY: 0x999999,
            DARKGREY: 0x777777,
            WHITE: 0xffffff
        }

        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()
        this.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true})
        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.setSize(window.innerWidth-100, window.innerHeight-200)
        this.boardElement = this.renderer.domElement

        const light = new THREE.DirectionalLight(this.colours.LIGHTGREY, 1)
        light.position.set(1, 1, 1).normalize()
        this.scene.add(light)

        this.camera.position.y = 2

        // Create a render sphere to move around to the correct location
        const previewSphereGeometry = new THREE.SphereGeometry(this.SPHERE_RADIUS, this.SPHERE_V_COUNT, this.SPHERE_V_COUNT)
        //                                                                    // TOOD, player colour
        const previewSphereMaterial = new THREE.MeshLambertMaterial({color: this.colours.RED, transparent: true})
        previewSphereMaterial.opacity = 0
        previewSphereMaterial.emissive.setHex(this.colours.RED) // TOOD, player colour
        this.previewSphere = new THREE.Mesh(previewSphereGeometry, previewSphereMaterial)
        this.scene.add(this.previewSphere)

        console.log("HERE", this)
        this.initBoards()
        this.renderLoop()
        this.rotate()

        this.boardElement.addEventListener("mousemove", event => {
            this.mouse.x = event.clientX / window.innerWidth * 2 - 1
            this.mouse.y = - event.clientY / window.innerHeight * 2 + 1
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

        box.position.x = (r - this.SPREAD) * this.BOX_WIDTH * this.SPACING
        box.position.y = (b - this.SPREAD) * this.BOX_WIDTH * this.SPACING
        box.position.z = (c - this.SPREAD) * this.BOX_WIDTH * this.SPACING
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

        sphere.position.x = (r - this.SPREAD) * this.BOX_WIDTH * this.SPACING
        sphere.position.y = (b - this.SPREAD) * this.BOX_WIDTH * this.SPACING
        sphere.position.z = (c - this.SPREAD) * this.BOX_WIDTH * this.SPACING
        sphere.origPos = {
            x: sphere.position.x,
            y: sphere.position.y,
            z: sphere.position.z
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
    }

    highlightColumn ({r, c}) {
        for (let b=0; b<this.span; b++) {
            this.boxes[b][r][c].material.opacity = this.OPACITY_ON
            this.boxes[b][r][c].material.emissive.setHex(this.colours.DARKGRAY)
            this.highlightedBoxes.push(this.boxes[b][r][c])
        }
    }

    highlightRowX ({b, r}) {
        for (let c=0; c<this.span; c++) {
            this.boxes[b][r][c].material.opacity = this.OPACITY_ON
            this.boxes[b][r][c].material.emissive.setHex(this.colours.DARKGRAY)
            this.highlightedBoxes.push(this.boxes[b][r][c])
        }
    }

    highlightRowY ({b, c}) {
        for (let r=0; r<this.span; r++) {
            this.boxes[b][r][c].material.opacity = this.OPACITY_ON
            this.boxes[b][r][c].material.emissive.setHex(this.colours.DARKGRAY)
            this.highlightedBoxes.push(this.boxes[b][r][c])
        }
    }

    // TEMP, until the gameState is fully bound
    getPreviewPosition (cube) {
        // if (!this.gravity) {...}
        const pos = {
            x : cube.position.x,
            y : cube.position.y,
            z : cube.position.z
        }
        return pos
    }

    renderLoop () {
        requestAnimationFrame(() => this.renderLoop())

        // Lerp the boxes into position, when exploded
        if (this.isLerpingBoxes) {
            console.log("this.span", this.span)
            for (let b=0; b<this.span; b++) {
                for (let r=0; r<this.span; r++) {
                    for (let c=0; c<this.span; c++) {

                        if (b!=this.SPREAD && r!=this.SPREAD && c!=this.SPREAD
                            && Math.abs(this.boxes[b][r][c].position.x - this.boxes[b][r][c].origPos.x * this.explodedMult) < 1e-4
                            && Math.abs(this.boxes[b][r][c].position.y - this.boxes[b][r][c].origPos.y * this.explodedMult) < 1e-4
                            && Math.abs(this.boxes[b][r][c].position.z - this.boxes[b][r][c].origPos.z * this.explodedMult) < 1e-4) {

                            // console.log("SETTING TO FALSE", b, r, c)
                            this.isLerpingBoxes = false
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

        // Lerp the spheres into their new place
        for (let b=0; b<this.span; b++) {
            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {

                    if (this.spheres[b][r][c] && this.spheres[b][r][c].isLerping) {

                        const sphere = this.spheres[b][r][c]
                        const {axis} = sphere.newPos

                        if (Math.abs(sphere.position[axis] - sphere.newPos[axis]) > 1e-6) {
                            sphere.position[axis] += (sphere.newPos[axis] - sphere.position[axis]) / 10
                        } else {
                            sphere.isLerping = false
                        }
                    }
                }
            }
        }


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

                    // TODO, assign the player colour to the class
                    // this.addSphere(this.hoveredObject.data.b, this.hoveredObject.data.r, this.hoveredObject.data.c, Math.random() < 0.5 ? this.colours.RED : this.colours.BLUE)
                    this.addPoint(this.hoveredObject.data.b, this.hoveredObject.data.r, this.hoveredObject.data.c, 0)
                }

            } else {

                // Set the currently hovered over object
                this.hoveredObject = intersects[0].object.data ? intersects[0].object : intersects[0].object.parent

                // TODO, only do this if the highlighted section will change
                this.clearHighlightedBoxes()
                if (this.hoveredObject.data) {
                    // Also TODO, decide which one of these to do, based on the current gravity
                    this.highlightColumn(this.hoveredObject.data)
                    // this.highlightRowX(this.hoveredObject.data)
                    // this.highlightRowY(this.hoveredObject.data)

                    // ALSO TODO, do the effect for a single box at a time, when there is no gravity selected
                }


                // Render the preview sphere at the correct location
                const {x, y, z} = this.getPreviewPosition(this.hoveredObject)
                this.previewSphere.position.x = x
                this.previewSphere.position.y = y
                this.previewSphere.position.z = z
                this.previewSphere.material.opacity = 0.5
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
        this.isLerpingBoxes = true
    }

    addPoint (board, row, col, player) {
        this.addSphere(board, row, col, this.playerColours[player].toUpperCase())
    }

    render (gameState) {
        this.resetBoard()

        for (let b=0; b<this.span; b++) {
            for (let r=0; r<this.span; r++) {
                for (let c=0; c<this.span; c++) {
                    if (gameState[b][r][c]) {
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

    // Highlight the column/row/vertical-column that will be affected by a move
    // styleHoverPreview (board, row, col) {



    // }


    rotate () {
        this.camera.position.x = Math.sin(this.rotation*Math.PI/180) * (this.BOX_WIDTH * 1.5) * this.span * 2
        this.camera.position.z = Math.cos(this.rotation*Math.PI/180) * (this.BOX_WIDTH * 1.5) * this.span * 2
    }

}

typeof window!="undefined" && (window.exports = window.exports || {})