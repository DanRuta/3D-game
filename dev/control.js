"use strict"

let ws, serverSideFetchSent = false
let hash = window.location.hash.split("#")[1]

window.tictactoe = {roomName : window.localStorage.getItem("roomName")}

if (window.location.protocol.includes("https"))
     ws = new WebSocket(`wss://${window.document.location.hostname}:443`)
else ws = new WebSocket(`ws://${window.document.location.hostname}:8000`)

const authoriseUser = () => {

    coordsBox.style.color = "rgba(150,150,150,0.8)"

    if (hash) window.tictactoe.roomName = hash

    if (!window.tictactoe.roomName) {
        return coordsBox.innerHTML = "No room name given"
    }

    coordsBox.innerHTML = "Authorising..."

    if (!window.localStorage.authenticator) {
        return coordsBox.innerHTML = "Not logged in. <br><br> Please log in and select the room to join, on the main page"
    }

    gapi.auth2.getAuthInstance().then(response => {

        window.GoogleAuth = response

        if (window.GoogleAuth.isSignedIn.get()){

            window.GoogleUser = response.currentUser.get()
            window.profile = window.GoogleUser.getBasicProfile()

            serverSideAuthorisation(window.GoogleUser.getAuthResponse().id_token)

        } else {
            coordsBox.innerHTML = "Not logged in. <br><br> Please log in and select the room to join, on the main page"
        }
    })
}

// Confirm server-side the user's identity, and if the room exists
const serverSideAuthorisation = (token) => {

    if (!serverSideFetchSent){
        serverSideFetchSent=true

        fetch("tokenSignin", {
            method: "Post",
            body: JSON.stringify({token, roomName: window.tictactoe.roomName})
        }).then(response => response.json())
        .then(({username, userId, roomExists}) => {

            window.tictactoe.username = username
            window.tictactoe.userId = userId
            coordsBox.innerHTML = "Connecting to room..."

            if (!roomExists) return coordsBox.innerHTML = `Room ${window.tictactoe.roomName} not found`

            initPage()
        })
    }
}

const initPage = () => {

    coordsBox.style.color = "rgba(50,50,50,0.8)"
    usernameDisplay.innerHTML = window.tictactoe.username
    roomNameDisplay.innerHTML = window.tictactoe.roomName

    enableFullScreen()

    let isDrawing = false
    let interfaceActions = []

    window.addEventListener("deviceorientation", () => {

        const alpha = Math.round(event.alpha)-360
        const beta = Math.max(Math.min(Math.round(event.beta)*2, 150), -150)

        // Display the alpha and beta values
        coordsBox.innerHTML = `(Alpha: ${alpha}, Beta: ${beta})`

        // Compile the payload
        const payload = {
            username : window.tictactoe.username,
            userId: window.tictactoe.userId,
            room: window.tictactoe.roomName,
            type: "controller",
            alpha: alpha,
            beta: beta,
            isDrawing: isDrawing,
            interfaceActions: interfaceActions
        }

        // Send the payload
        ws.send(JSON.stringify(payload))

        // Clear the interface actions list
        interfaceActions = []
    })
}


const enableFullScreen = () => {

    const getFullScreen = () => {

        main.removeEventListener("click", getFullScreen)

        new NoSleep().enable()

        if (!window.location.href.includes("localhost") && (
           document.fullscreenEnabled && main.requestFullScreen() ||
           document.webkitFullscreenEnabled && main.webkitRequestFullScreen() ||
           document.mozFullScreenEnabled && main.mozRequestFullScreen() ||
           document.msFullScreenEnabled && main.msRequestFullScreen())){}
    }

    main.addEventListener("click", getFullScreen)
}

window.addEventListener("load", authoriseUser)