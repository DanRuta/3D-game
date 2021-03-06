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
    // controls.target.set(
    //     Math.cos(camera.position.x*Math.PI/180) * 4,
    //     camera.position.y,
    //     Math.sin(camera.position.z*Math.PI/180) * 4
    // )
    controls.target.set(camera.position.x+0.15, camera.position.y, camera.position.z)
    // controls.enablePan = false
    // controls.enableZoom = false
    controls.noPan  = true
    controls.noZoom = true


    // Set VR controls if available
    if (navigator.userAgent.toLowerCase().includes("mobile")) {
        controls = new THREE.VRControls(camera)
        controls.update()
    } else {
        const setOrientationControls = event => {

            if (!event.alpha) return

            controls = new THREE.VRControls(camera)
            controls.update()

            window.removeEventListener("deviceorientation", setOrientationControls)
        }
        window.addEventListener("deviceorientation", setOrientationControls)
    }

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
    if (getParameters().t != "n") {
        getVideoFeed()
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
    winPanel.innerText = game.players[e.detail].name + " Wins!"
}

function displayTie (e) {
    winPanel.style.display = "block"
    winPanel.style.textAlign = "center"
    winPanel.innerText = game.players[e.detail].name + " Caused a tie!"
}

function connectWebSockets(roomName) {

    let wsPath = `ws://${window.location.hostname}:8000/${roomName}`

    // Upgrade to secure connection
    if (window.location.protocol.includes("https")) {
        wsPath = `wss://${window.location.hostname}:443/${roomName}`
    }

    ws = new WebSocket(wsPath)

    ws.addEventListener("message", (message) => {
        const data = JSON.parse(message.data)

        if (data.type === "gravity") {
            game.shiftGravity(data.direction)

        } else if (data.type === "move") {

            const player = data.playerIndex
            const {b, r, c} = data
            game.makeMove(player, b, r, c)
        }
    })

    ws.addEventListener("open", () => {
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