"use strict"

let ws
let roomNameValue

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

    // let isRotating = false
    let rotation = 45
    let mouseIsDown = false
    // let isRotatingTimeout

    resetButton.addEventListener("click", () => {
        content.innerHTML = ""

        const {g, span, p} = getParameters()

        window.game = new GameLogic({
            gravityEnabled: !g || g=="1",
            gameBoard: GameBoard,
            span: parseInt(span) || 3,
            players: parseInt(p) || 2
            // isTraining: false,
            // aiOpponent: aiOpponentCheckbox.checked,
            // isMultiplayer: false
        })
        content.appendChild(game.board.boardElement)

        roomNameValue = getURLParameter("roomName")

        if (roomNameValue !== "") {
            connectWebSockets(roomNameValue)
            roomNameTitle.innerText = roomNameValue
        }
        setPlayerLabels()
        setupPlayersTags()
    })
    resetButton.click()



    // Arrows stuff
    const initArrows = () => {

        let hoveredObject
        let clickedObject
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

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
        camera.position.z = 4
        camera.position.y = 2
        const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true})
        renderer.setPixelRatio( window.devicePixelRatio )
        renderer.setSize(400, 400)
        renderer.domElement.id = "arrowsCanvas"
        arrowsContainer.appendChild(renderer.domElement)

        const loader = new THREE.ObjectLoader()
        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()
        const light = new THREE.DirectionalLight( 0xffffff, 0.5 )
        light.position.set( 0, 1, 0 ).normalize()
        scene.add(light)

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
            camera.lookAt(scene.position)

            // const vector = new THREE.Vector3(mouse.x, mouse.y, 1)
            camera.updateMatrixWorld()
            raycaster.setFromCamera( mouse, camera )

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
            renderer.render(scene, camera)
        }

        render()

        const setRotation = rotation => {
            camera.position.x = Math.sin(rotation*Math.PI/180) * 3
            camera.position.z = Math.cos(rotation*Math.PI/180) * 3
            this.game.board.rotation = rotation
            this.game.board.rotate()
        }
        setRotation(rotation=-45)

        renderer.domElement.addEventListener("mousemove", event => {
            const sizeY = event.target.height
            const sizeX = event.target.width
            mouse.x = event.offsetX / sizeX * 2 - 1
            mouse.y = -event.offsetY / sizeY * 2 + 1
        }, false)

        document.addEventListener("mousedown", event => {
            if (event.target == arrowsCanvas) {
                mouseIsDown = true
            } else if (event.target == rendererDomElement) {
                game.board.mouseIsDown = true
            }
        })

        document.addEventListener("mouseup", () => {
            mouseIsDown = false
            game.board.mouseIsDown = false
        })

        document.addEventListener("click", () => {
            mouseIsDown = false
            game.board.mouseIsDown = false
        })

        window.addEventListener("wheel", ({deltaY}) => {
            game.board.rotationValue += (deltaY > 0 ? 1 : -1) * 5
            game.board.rotate()

            rotation = (rotation + (deltaY > 0 ? 1 : -1) * 5) % 360
            setRotation(rotation)
        })


        window.addEventListener("keydown", e => {
            if (e.code == "Space") {
                game.board.toggleExploded()
            }
        })

        // Resize the rendered element on window resize
        window.addEventListener("resize", () => {
            game.board.renderer.setSize(window.innerWidth-100, window.innerHeight-200)
            game.board.camera.aspect = window.innerWidth / window.innerHeight
            game.board.camera.updateProjectionMatrix()
        })
    }
    initArrows()

    window.addEventListener("T^3Win", winnerWinnerChickenDinner)
    window.addEventListener("T^3Tie", noChickenDinner)
})

function  winnerWinnerChickenDinner(e) {
    turnPanel.classList.remove("d-flex")
    turnPanel.style.display = "none"
    winPanel.style.display = "block"
    winPanel.innerText = game.players[e.detail].name + " Winns!"

}
function  noChickenDinner(e) {
    turnPanel.classList.remove("d-flex")
    turnPanel.style.display = "none"
    winPanel.style.display = "block"
    winPanel.innerText = game.players[e.detail].name + " Caused a tie!"

}

function connectWebSockets(roomName) {
    ws =  new WebSocket("ws://vrscrible.localhost:8001/" + roomName)

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
    setPlayerLabels()
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

function setPlayerLabels(){
    currentTurn.innerText =  game.players[game.playerIndex].name
    const nextPlayer = game.playerIndex == game.players.length -  1 ? 0 : game.playerIndex + 1
    nextTurn.innerText = game.players[nextPlayer].name
}

function setupPlayersTags() {
    let htmlToPut = ""
    game.players.forEach(player =>{
        htmlToPut += `
                              <!-- /.player -->
                                <li class="player">
                                    <ul class="list-unstlyed">
                                        <li class="player-colour" data-colour="green">${game.board.playerColours[player.playerIndex].toUpperCase()}</li>
                                        <!-- /.player-colour -->
                                        <li class="player-name">${player.name}:</li>
                                        <!-- /.player-name -->
                                        <li class="player-score"></li>
                                        <!-- /.player-score -->
                                    </ul>
                                </li> `
    })
    playersInGame.innerHTML = htmlToPut
}