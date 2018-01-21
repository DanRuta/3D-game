"use strict"

window.tictactoe = window.tictactoe || {}
window.tictactoe.textures = {}
window.tictactoe.roomName = window.localStorage.getItem("roomName")

let ws

// Use secure WebSocket for secure origin
if (window.location.protocol.includes("https")) {
    ws = new WebSocket(`wss://${window.document.location.hostname}:443`)
} else {
    ws = new WebSocket(`ws://${window.document.location.hostname}:8000`)
}

const users = {}

let hasController
let controls
let renderer

let userInterface, effect
let sphereRadius = 1000
let sphereVertexCount = 40
let serverSideFetchSent = false
let hash = window.location.hash.split("#")[1]

let testBox

// Authorise the user from Google
const authoriseUser = () => {

    if (hash) window.tictactoe.roomName = hash

    if (!window.tictactoe.roomName && !window.localStorage.editRoomName) {
        return splashText.innerHTML = "No room name given"
    }

    splashText.innerHTML = "Authorising..."

    if (!window.localStorage.authenticator) {
        return splashText.innerHTML = "Not logged in. <br><br> Please log in and select the room to join, on the main page"
    }

    gapi.auth2.getAuthInstance().then(response => {

        window.GoogleAuth = response

        if (window.GoogleAuth.isSignedIn.get()) {

            window.GoogleUser = response.currentUser.get()
            window.profile = window.GoogleUser.getBasicProfile()

            serverSideAuthorisation(window.GoogleUser.getAuthResponse().id_token, "Google")

        } else splashText.innerHTML = "Not logged in. <br><br> Please log in and select the room to join, on the main page"
    })
}

// Confirm server-side the user's identity, and if the room exists
// TODO, this needs re-doing
const serverSideAuthorisation = (token, authenticator) => {

    window.tictactoe.authenticator = authenticator
    window.tictactoe.token = token

    if (!serverSideFetchSent) {

        serverSideFetchSent = true

        fetch("tokenSignin", {
            method: "Post",
            body: JSON.stringify({token, authenticator, roomName: window.tictactoe.roomName})
        }).then(response => response.json())
        .then(({username, userId, roomExists}) => {

            window.tictactoe.username = username
            window.tictactoe.userId = userId
            splashText.innerHTML = "Connecting to room..."
            console.log(`Username: ${window.tictactoe.username} (ID: ${window.tictactoe.userId}) - Room: ${window.tictactoe.roomName}`)

            if (!roomExists) {
                return splashText.innerHTML = `Room ${window.tictactoe.roomName} not found`
            } else init()
        })
    }
}

const init = () => {

    // Prevent the device from going into sleep mode, to keep the screen turned on
    screen.keepAwake = true

    // Initialise THREEjs components, starting with the renderer
    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true})
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.autoClear = false

    document.body.appendChild(renderer.domElement)
    splash.style.display = "none"

    renderer.domElement.addEventListener("click", () => {

        new NoSleep().enable()

        if (!window.location.href.includes("localhost") && (
           document.fullscreenEnabled && renderer.domElement.requestFullScreen() ||
           document.webkitFullscreenEnabled && renderer.domElement.webkitRequestFullScreen() ||
           document.mozFullScreenEnabled && renderer.domElement.mozRequestFullScreen() ||
           document.msFullScreenEnabled && renderer.domElement.msRequestFullScreen())) {}
    })


    // Stereo Effect
    // Separate the Gear VR browser from normal phone browsers to avoid current issue with VREffect not
    // rendering multiple scenes. StereoEffect is used in non-gearvr browsers
    // effect = navigator.userAgent.includes("Mobile VR") ? new THREE.VREffect(renderer) : new THREE.StereoEffect(renderer)

    // effect = new THREE.StereoEffect(renderer)
    effect = new THREE.VREffect(renderer)
    effect.separation = 0
    effect.setSize(window.innerWidth, window.innerHeight)


    let vrDisplay
    navigator.getVRDisplays().then(displays => {
        if (displays.length > 0) {
            vrDisplay = displays[0]
        }
    })

    // Add button to enable the VR mode
    const vrButton = VRSamplesUtil.addButton("Enter VR", "E", "/images/cardboard64.png", () => {

        if (navigator.userAgent.includes("Mobile VR")) {
            vrDisplay.requestPresent([{source: renderer.domElement}])
        } else {
            effect = new THREE.StereoEffect(renderer)
            effect.separation = 0
            effect.setSize(window.innerWidth, window.innerHeight)
            document.getElementById("vr-sample-button-container").style.display = "none"
        }
    })

    // Scenes and camera
    window.tictactoe.scene = new THREE.Scene()

    window.tictactoe.camera = new THREE.PerspectiveCamera(100, window.innerWidth/window.innerHeight, 1, 4000)
    // Uncomment to move camera to outside the sphere (debuging)
    // window.tictactoe.camera.position.z = sphereRadius
    window.tictactoe.scene.add(window.tictactoe.camera)
    // window.tictactoe.camera.rotation.order = "YXZ"
    window.tictactoe.camera.rotation.x = 3.1
    window.tictactoe.camera.rotation.y = 0
    window.tictactoe.camera.rotation.z = 3.1


    // For continuing, related to rotations
    // https://stackoverflow.com/questions/20089098/three-js-adding-and-removing-children-of-rotated-objects/20097857#20097857

    const testBoxCanvas = document.createElement("canvas")
    testBoxCanvas.height = 100
    testBoxCanvas.width = 100
    const testBoxContext = testBoxCanvas.getContext("2d")
    testBoxContext.fillStyle = "blue"
    testBoxContext.fillRect(0, 0, 100, 100)

    const testBoxTexture = new THREE.Texture(testBoxCanvas)
    testBoxTexture.minFilter = THREE.NearestFilter

    const testBoxGeometry = new THREE.BoxGeometry(100, 100, 100)
    const testBoxMaterial = new THREE.MeshBasicMaterial({
        map: testBoxTexture
    })
    testBox = new THREE.Mesh(testBoxGeometry, testBoxMaterial)
    // testBox.position.y = 250
    testBox.position.z = 250

    window.tictactoe.scene.add(testBox)

    window.addEventListener("deviceorientation", (e) => {
        if (!hasController) {
            // console.log(e)
            testBox.rotation.y = -0.0174533*e.alpha
            testBox.rotation.z = -0.0174533*e.beta / 20

            // window.tictactoe.camera.rotation.x = -0.0174533*e.alpha
            // window.tictactoe.camera.rotation.z = -0.0174533*e.beta
            background.rotation.z = -0.0174533*e.beta
        }
    })


    // Initialise Canvases
    const backgroundCanvas = document.createElement("canvas")
    const bufferCanvas = document.createElement("canvas") // For UI stuff

    backgroundCanvas.height = bufferCanvas.height = 1024
    backgroundCanvas.width = bufferCanvas.width = 2048
    backgroundCanvas.id = "backgroundCanvas"

    const backgroundCanvasContext = backgroundCanvas.getContext("2d")
    const bufferCanvasContext = bufferCanvas.getContext("2d")

    // Colour in the background sphere
    backgroundCanvasContext.beginPath()
    backgroundCanvasContext.rect(0,0, backgroundCanvas.width, backgroundCanvas.height)
    backgroundCanvasContext.fillStyle = "white"
    backgroundCanvasContext.fill()
        // For debugging, to see camera movements actually doing something
        backgroundCanvasContext.moveTo(0, 0)
        backgroundCanvasContext.lineTo(backgroundCanvas.width, backgroundCanvas.height)
        backgroundCanvasContext.stroke()

    // Add background image if one exists
    // TODO, re-implement adding backgroundImgBase64 from server. Leave this here until then
    if (window.tictactoe.backgroundImgBase64) {
        const backgroundImg = document.createElement("img")
        backgroundImg.addEventListener("load", () => {
            backgroundCanvasContext.scale(-1, 1)
            backgroundCanvasContext.drawImage(backgroundImg, 0, 0, backgroundCanvas.width*-1, backgroundCanvas.height)
        })
        backgroundImg.src = "data:image/jpeg;base64," + window.tictactoe.editScribbleBase64
    }

    // SPHERE ELEMENTS
    // Background
    window.tictactoe.textures.backgroundTexture = new THREE.Texture(backgroundCanvas)
    const backgroundMaterial = new THREE.MeshBasicMaterial({map: window.tictactoe.textures.backgroundTexture, side: THREE.BackSide, color: 0xffffff})
    const background = new THREE.Mesh(new THREE.SphereGeometry(sphereRadius, sphereVertexCount, sphereVertexCount), backgroundMaterial)
    window.tictactoe.scene.add(background)


    // Buffer
    window.tictactoe.textures.bufferTexture = new THREE.Texture(bufferCanvas)
    const bufferMaterial = new THREE.MeshBasicMaterial({map: window.tictactoe.textures.bufferTexture,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
    })
    window.tictactoe.scene.add(new THREE.Mesh(new THREE.SphereGeometry(sphereRadius-25, sphereVertexCount, sphereVertexCount), bufferMaterial))


    // Set minFilter value, to resolve the power of two issue
    for (let texture in window.tictactoe.textures) {
        window.tictactoe.textures[texture].minFilter = THREE.NearestFilter
    }

    // Controls
    // let controls = new THREE.OrbitControls(window.tictactoe.camera, renderer.domElement)
    // controls.target.set(
    //     window.tictactoe.camera.position.x+0.15,
    //     window.tictactoe.camera.position.y,
    //     window.tictactoe.camera.position.z
    // )
    // controls.noPan  = true
    // controls.noZoom = true


    // // Set VR controls if available
    // const setOrientationControls = event => {

    //     if (!event.alpha) return

    //     // controls = new THREE.DeviceOrientationControls(window.tictactoe.camera, true)
    //     controls = new THREE.VRControls(window.tictactoe.camera)
    //     controls.update()

    //     window.removeEventListener("deviceorientation", setOrientationControls)
    // }
    // window.addEventListener("deviceorientation", setOrientationControls)


    // Animation loop
    const animate = () => {

        requestAnimationFrame(animate)

        if (controls) {
            controls.update()
        }

        // Do here any changes to VR UI elements, when needed

        // Update sphere textures
        for (let texture in window.tictactoe.textures) {
            window.tictactoe.textures[texture].needsUpdate = true

        }

        testBoxTexture.needsUpdate = true

        renderer.clear()
        effect.render(window.tictactoe.scene, window.tictactoe.camera)
    }

    animate()
    connectWebSocket()
}

// Enable VR panning once a controller is connected
const enableControls = () => {

    controls = new THREE.OrbitControls(window.tictactoe.camera, renderer.domElement)

    controls.target.set(
        window.tictactoe.camera.position.x+0.15,
        window.tictactoe.camera.position.y,
        window.tictactoe.camera.position.z
    )

    // requestAnimationFrame(() => {
    //     window.tictactoe.camera.rotation.x = 3.1
    //     window.tictactoe.camera.rotation.y = 0
    //     window.tictactoe.camera.rotation.z = 3.1
    // })
    controls.noPan  = true
    controls.noZoom = true

    // Set VR controls if available
    const setOrientationControls = event => {

        if (!event.alpha) return

        // controls = new THREE.DeviceOrientationControls(window.tictactoe.camera, true)
        controls = new THREE.VRControls(window.tictactoe.camera)
        controls.update()

        window.removeEventListener("deviceorientation", setOrientationControls)
    }
    window.addEventListener("deviceorientation", setOrientationControls)
}

// Register the page, serverside. Allow 5 attempts, until connection deemed too bad to continue
const connectWebSocket = (attempt=1) => {

    if (attempt>5) {
        return renderToast(`Cannot connect to WebSocket server`)
    }

    renderToast(`Attempt to connect WebSockets (${attempt}/5)`)

    try {
        ws.send(JSON.stringify({username: window.tictactoe.username, userId: window.tictactoe.userId, room: window.tictactoe.roomName, type: "viewer"}))
        initWebSockets()
    } catch(e) {
        setTimeout(connectWebSocket, 750, ++attempt)
    }
}

// Temporary, until this is re-implemented
const renderToast = console.log

// Listen for any messages from the server and take appropriate action
const initWebSockets = () => {

    console.log("Websocket listening...")
    renderToast(`Connected!`)

    // Websocket input
    ws.onmessage = event => {

        const data = JSON.parse(event.data)
        // console.log(data)

        // Route all message types to their respective actions
        switch (true) {

            // Exit early if a message without a valid connection type is received
            case (data.type && data.type!="controller" && data.type!="viewer"):
                return

            // Handle a new viewer connection
            case (data.type && data.type=="viewer"):

                // Display a toast, to otherwise announce the new viewer connection
                if (data.userId != window.tictactoe.userId) {
                    return renderToast(`User ${data.username}'s ${data.type} connected`)
                }
                break

            // If a new controller connects, create a new User instance
            // case(!users[data.username]):
            //     users[data.username] = new User({name: data.username}, sphereRadius, sphereVertexCount)
            //     break


            // When a user disconnects, clear their data
            case (data.hasOwnProperty("disconnectedType")):

                if (data.username==window.tictactoe.username) {
                    renderToast(`Your ${data.disconnectedType} disconnected`)
                    delete users[data.username]
                } else {
                    renderToast(`${data.username}'s ${data.disconnectedType} disconnected`)
                    delete users[data.username]
                }
                break

            default:

                if (!hasController) {
                    hasController = true
                    renderToast("Your controller is connected")
                    enableControls()
                }

                console.log(window.tictactoe.camera.rotation)

                // Rotate the boards
                testBox.rotation.y = -0.0174533*data.alpha
                testBox.rotation.z = -0.0174533*data.beta / 20

        }
    }
}

// Resize the rendered element on window resize
window.addEventListener("resize", () => {
    effect.setSize(window.innerWidth, window.innerHeight)
    window.tictactoe.camera.aspect = window.innerWidth / window.innerHeight
    window.tictactoe.camera.updateProjectionMatrix()
})

window.addEventListener("load", authoriseUser)