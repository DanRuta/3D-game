"use strict"

let ws
let hoveredObject
let clickedObject
let mouseIsDown = false
let rotation = 45

const WHITE = 0xaaaaaa
const YELLOW = 0xaaaa00
const CYAN = 0x00aaaa
const arrowModels = []
const arrowNames = ["left", "right", "up", "down", "forward", "backward"]
const rotations = [
    {x: 0.25, y: 0.0, z: 0}, // left
    {x: 0.25, y: 0.50, z: 0}, // right
    {x: 0.25, y: 0.75, z: 0}, // up
    {x: 0.25, y: 0.25, z: 0}, // down
    {x: 0.25, y: 0.50, z: 0.25}, // forward
    {x: 0.25, y: 0.50, z: 0.75} // backward
]
const positions = [
    {x: -0.125, y: 0, z: 0}, // left
    {x: 0.125, y: 0, z: 0}, // right
    {x: 0, y: 0.1, z: 0}, // up
    {x: 0, y: -0.1, z: 0}, // down
    {x: 0, y: 0, z: -0.125}, // forward
    {x: 0, y: 0, z: 0.125} // backward
]


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
    effect.separation = 0
    effect.setSize(window.innerWidth, window.innerHeight)

    let vrDisplay
    if (navigator.getVRDisplays) {
        navigator.getVRDisplays().then(displays => displays.length && (vrDisplay = displays[0]))
    }


    // Button to enable VR mode
    enterVRButton.addEventListener("click", () => {
        const controls = document.getElementById("controls")

        if (enterVRButton.classList.contains("small")) {
            effect = new THREE.VREffect(renderer)
            effect.separation = 0
            effect.setSize(window.innerWidth, window.innerHeight)

            enterVRButton.classList.remove("small")
        } else {
            if (navigator.userAgent.includes("Mobile VR")) {
                vrDisplay.requestPresent([{source: renderer.domElement}])
            } else {
                effect = new THREE.StereoEffect(renderer)
                effect.separation = 0
                effect.setSize(window.innerWidth, window.innerHeight)
            }

            enterVRButton.classList.add("small")
        }
    })

    // Scenes and camera
    const fov = 70
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 1000)
    scene.add(camera)
    camera.position.z = 4
    camera.position.y = 2

    // Controls
    let controls = new THREE.OrbitControls(camera, renderer.domElement)
    controls.target.set(
        camera.position.x+0.15,
        camera.position.y,
        camera.position.z
    )
    controls.noPan  = true
    controls.noZoom = true

    // Set VR controls if available
    const setOrientationControls = event => {

        if (!event.alpha) return

        controls = new THREE.VRControls(camera)
        controls.update()

        window.removeEventListener("deviceorientation", setOrientationControls)
    }
    window.addEventListener("deviceorientation", setOrientationControls)


    const loader = new THREE.ObjectLoader()
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const light = new THREE.DirectionalLight( 0xffffff, 0.5 )
    light.position.set( 0, 1, 0 ).normalize()
    scene.add(light)



    // Add arrow models
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
                    c.material.emissive.setHex(CYAN)
                    clickedObject = model
                } else {
                    c.material.emissive.setHex(WHITE)
                }
            })

            arrowModels.push(model)
            model.data = {arrowIndex: a}
            scene.add(model)
        })
    }


    const render = () => {

        requestAnimationFrame(render)
        controls.update()

        camera.lookAt(scene.position)
        camera.updateMatrixWorld()
        raycaster.setFromCamera(mouse, camera)

        const intersects = raycaster.intersectObjects(scene.children, true)

        if (intersects.length) {

            hoveredObject = intersects[0].object.name.toLowerCase().startsWith("box") ? intersects[0].object.parent : intersects[0].object

            document.body.style.cursor = "pointer"

            if (hoveredObject == clickedObject) {
                // do nothing
            } else {

                if (mouseIsDown) {
                    if (clickedObject) {
                        // Clear old one
                        clickedObject.children.forEach(c => c.material.emissive.setHex(WHITE))
                    }

                    // Set new one to cyan
                    hoveredObject.children.forEach(c => c.material.emissive.setHex(CYAN))
                    clickedObject = hoveredObject
                    console.log("clicked", arrowNames[clickedObject.data.arrowIndex])
                    if (ws){
                        ws.send(JSON.stringify({
                            direction: arrowNames[clickedObject.data.arrowIndex],
                            userId: "1234",
                            username: "rob",
                            type: "text",
                            room: roomNameValue,
                            type: "gravity"
                        }))

                    } else {
                        game.shiftGravity(arrowNames[clickedObject.data.arrowIndex])
                    }
                } else {
                    // Hovering over non clicked item without the mouse down
                    arrowModels.forEach(arrow => {
                        if (arrow != clickedObject) {
                            arrow.children.forEach(c => c.material.emissive.setHex(WHITE))
                        }
                    })

                    if (hoveredObject != clickedObject) {
                        hoveredObject.children.forEach(c => c.material.emissive.setHex(YELLOW))
                    }
                }
            }

        } else {
            document.body.style.cursor = "default"
            if (arrowModels) {
                arrowModels.forEach(arrow => {

                    if (arrow != clickedObject) {
                        arrow.children.forEach(c => c.material.emissive.setHex(WHITE))
                    }
                })
            }
            hoveredObject = null
        }
        // renderer.render(scene, camera)
        effect.render(scene, camera)

    }
    render()


    const setRotation = rotation => {
        camera.position.x = Math.sin(rotation*Math.PI/180) * 3
        camera.position.z = Math.cos(rotation*Math.PI/180) * 3
        // this.game.board.rotation = rotation
        // this.game.board.rotate()
    }
    setRotation(rotation=-45)


    window.addEventListener("wheel", ({deltaY}) => {
        // game.board.rotationValue += (deltaY > 0 ? 1 : -1) * 5
        // game.board.rotate()

        rotation = (rotation + (deltaY > 0 ? 1 : -1) * 5) % 360
        setRotation(rotation)
    })

    document.addEventListener("mousedown", event => {
        // if (event.target == arrowsCanvas) {
        mouseIsDown = true
        // } else if (event.target == rendererDomElement) {
        // game.board.mouseIsDown = true
        // }
    })

    document.addEventListener("mouseup", () => {
        mouseIsDown = false
        // game.board.mouseIsDown = false
    })

    document.addEventListener("click", () => {
        mouseIsDown = false
        // game.board.mouseIsDown = false
    })

    console.log("hi")
})