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
                loader.load("lib/arrow.json", model => {

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