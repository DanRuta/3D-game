"use strict"

let sendData, websocketClients=[], keys

const fs = require("fs")
const fetch = require("node-fetch")
const url = require("url")
const db = require("./mongo")

// Need this for prod server, where the path needs to be prefixed with the project folder
let serverPath = ""

try {
    keys = JSON.parse(fs.readFileSync("keys.json"))
} catch (e) {
    try {
        keys = JSON.parse(fs.readFileSync("./t3/keys.json"))
        serverPath = "t3/"
    } catch (e) {
        console.log("Could not parse keys. Did you remember to add the keys.json file?\n\n", e)
    }
}
const googleClientId = process.argv.includes("dev") ? keys.dev : keys.dist

let rooms = []

// GET
// ===
const index = (request, response) => {
    sendData({request, response, code: 200, data: fs.readFileSync(`./${serverPath}index.html`, "utf8"), contentType: "text/html"})
}

const sendGame2D = async (request, response) => {
    const params = url.parse(request.url, true)
    const roomName = params.query.roomName ? params.query.roomName : false

    if (roomName){
        const room = await db.getRoom(roomName)

        if (!room){
            await db.createRoom(roomName)
        }
    }
    sendData({request, response, code: 200, data: fs.readFileSync(`${serverPath}game2d.html`, "utf8"), contentType: "text/html"})
}

const getGameState = async (request, response) => {
    const params = url.parse(request.url, true)
    const roomName = params.query.roomName ? params.query.roomName : false

    const data = await db.getRoom(roomName)
    const gameState = data && data.gameState ? data.gameState : null
    const dataToSend = JSON.stringify({gameState: gameState})

    sendData({request, response, code: 200, data: dataToSend, contentType: "application/json"})
}


// POST
// ====
const getAIMove = async (request, response, {gameState}) => {

    const moves = getAvailableMoves(gameState)
    const key = gameState.join("").replace(/,/g,"")

    db.getQ(key).then(qs => {
        console.log("qs:", qs ? qs.length : qs, "for:", key)

        let move
        qs = qs[0]

        // No knowledge of this state. Set to 1 and make a random move
        if (qs===undefined) {

            console.log("dunno lol")
            // TODO, set the db value to 1
            move = moves[Math.floor(Math.random()*moves.length)]

        } else {
            delete qs.key
            delete qs._id

            const qVals = moves.map(m => qs[m.toString().replace(/,/g, "")])
            const maxQ = qVals.slice(0).sort().reverse()[0]

            move = moves[qVals.indexOf(maxQ)]
        }

        sendData({request, response, code: 200, data: JSON.stringify({move})})
    })
}

const rewardAI = (request, response, {value, gameState}) => {
    // TODO, train AI as people play the game
    sendData({request, response, code: 200, data: "{}"})
}



const roomExists = (request, response, {roomName}) => {
    sendData({request, response, code: 200, data: JSON.stringify({roomExists: rooms.includes(roomName), roomName}), contentType: "text/plain"})
}

const createRoom = async (request, response, {roomName}) => {

    let responseData

    const roomExists = await db.getRoom(roomName)

    if (roomExists === []) {
        await db.createRoom(roomName)
        responseData = roomName
    }

    sendData({request, response, code: 200, data: JSON.stringify({roomName: responseData}), contentType: "text/plain"})
}


const saveGameState = (request, response, {roomName, gameState}) => {

    db.updateRoom(roomName, gameState)
}


const tokenSignin = async (request, response, {authenticator, token, roomName}) => {

    let roomExists

    authenticateUser(token, authenticator, ({id, name, email}) => {

        /*
            TODO, check the users data in the db. Do what is needed, eg adding, updating, etc
        */

        const finishAndSend = () => sendData({request, response, code: 200, data: JSON.stringify({username, userId, newUser, roomExists})})

        if (roomName) {
            // TODO, Check if the room exists
            // roomExists = .....
            finishAndSend()
        } else {
            finishAndSend()
        }
    })
}


const handleWebSocket = async (connection, clients) => {

    websocketClients = clients

    try {


        connection.on("message", message => {

            message = JSON.parse(message)
            // Save the room state else talk back
            if (message.type ==  "state"){
                db.updateRoom(message.room, message.gameState)

            } else  {

                // Register the user data to the connection
                if (!connection.meta) {
                    connection.meta = {
                        userId: message.userId,
                        username : message.username,
                        room: message.room,
                        type: message.type
                    }
                }

                websocketClients.forEach(client => {
                    if (client.meta && client.meta.room == connection.meta.room) {
                        client.send(JSON.stringify(message))
                    }
                })
            }

        })

        connection.on("close", () => {

            // Remove the connection from the websocketClients list
            websocketClients.splice(websocketClients.indexOf(connection), 1)

            if (!connection.meta) {
                return
            }

            let roomIsEmpty = true

            websocketClients.forEach(client => {

                if (!client.meta)   return

                if (client.meta.room==connection.meta.room) {

                    roomIsEmpty = false

                    try {
                        client.send(JSON.stringify({username: connection.meta.username, disconnectedType: connection.meta.type}))
                    } catch (e) {
                        console.warn("Error broadcasting closed connection", connection.meta, e)
                    }
                }
            })

            if (roomIsEmpty) {
                setTimeout(() => {

                    let roomStillEmpty = true

                    websocketClients.forEach(client => {
                        if (client.meta.room==connection.meta.room) {
                            roomStillEmpty = false
                        }
                    })

                    if (roomStillEmpty) {
                        rooms.splice(rooms.indexOf(connection.meta.room), 1)
                    }

                }, 10000)
            }
        })
    } catch (e) {console.log(`\nPrevented WebSocket crash. Rooms: ${rooms} Meta: ${connection.meta}`)}
}



// Helper Functions
// ================
const authenticateUser = (token, authenticator, callback) => {
    fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`)
    .then(googleResponse => googleResponse.json())
    .then(({aud,name,sub,email,picture}) => {

        if (aud.includes(googleClientId)) {
            callback({id: sub, name, email, picture})
        }
    })
}

const getAvailableMoves = gameState => {
    const moves = []
    const span = gameState[0].length

    for (let b=0; b<span; b++) {
        for (let r=0; r<span; r++) {
            for (let c=0; c<span; c++) {
                if (Number.isNaN(parseInt(gameState[b][r][c]))) {
                    moves.push([b, r, c])
                }
            }
        }
    }

    return moves
}

// Export routes to these functions to the server
exports.initProject = ({sendDataCallback}) => {

    sendData = sendDataCallback
    rooms = []

    return {
        get: {
            [/$/] : index,
            [/game$/] : sendGame2D,
            [/getGameState/] : getGameState
        },
        post: {
            [/getAIMove/] : getAIMove,
            [/rewardAI/] : rewardAI,

            [/roomExists/] : roomExists,
            [/createRoom/] : createRoom,

            [/tokenSignin/] : tokenSignin,

            [/saveGameState/] : saveGameState
        },
        ws: handleWebSocket
    }
}