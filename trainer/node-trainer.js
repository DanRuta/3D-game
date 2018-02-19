// node --max-old-space-size=24576 node-trainer.js -i 20000
"use strict"

global.readline = require("readline")
const fs = require("fs")
const args = process.argv.slice(2, 12)
const {GameLogic} = require("./GameLogic.js")
const {GamePlayer} = require("./GamePlayer.js")
const db = require("../mongo.js")

let deleteData = false
let doTraining = true
let reader
let epsilon = 0.5
let epochs = 2000

for (let a=0; a<args.length; a++) {
    switch (args[a]) {

        case "-e":
            epsilon = parseInt(args[a+1])
            a++
            break

        case "-i":
            epochs = parseInt(args[a+1])
            a++
            break

        case "-t":
            doTraining = args[a+1].trim().toLowerCase()=="y"

            if (args[a+1].trim().toLowerCase()=="d") {
                deleteData = true
            }

            a++
            break

    }
}
console.log("epsilon", epsilon)
console.log("epochs", epochs)


// Do some stuff to make the unused browser stuff not break the script
global.playerNum = {style: {}}
global.winsDisplay = {style: {}}
global.GamePlayer = GamePlayer
// Implement a rudimentary way to be able to do common sense tests on the learned logic,
// without a browser
global.GameBoard = class GameBoard {
    constructor (game) {
        this.game = game
        this.playerColours = []
    }
    resetBoard () {}
    addPoint () {this.render(this.game.gameState)}
    render (gameState) {
        if (!this.game.isTraining) {
            let g = gameState
            console.log(
`
 ${g[0][0][0]} | ${g[0][0][1]} | ${g[0][0][2]}\t${g[1][0][0]} | ${g[1][0][1]} | ${g[1][0][2]}\t${g[2][0][0]} | ${g[2][0][1]} | ${g[2][0][2]}
 __________\t__________\t__________
 ${g[0][1][0]} | ${g[0][1][1]} | ${g[0][1][2]}\t${g[1][1][0]} | ${g[1][1][1]} | ${g[1][1][2]}\t${g[2][1][0]} | ${g[2][1][1]} | ${g[2][1][2]}
 __________\t__________\t__________
 ${g[0][2][0]} | ${g[0][2][1]} | ${g[0][2][2]}\t${g[1][2][0]} | ${g[1][2][1]} | ${g[1][2][2]}\t${g[2][2][0]} | ${g[2][2][1]} | ${g[2][2][2]}
`)
        }
    }
}


global.game = new GameLogic({
    span: 3,
    players: 2,
    aiOpponent: true,
    gravityEnabled: false
})
game.db = db

if (deleteData) {

    db.deleteAllQ().then(() => console.log("data deleted"))

} else if (doTraining) {

    const start = Date.now()
    game.trainAI({epochs, epsilon})
    console.log(`Training duration: ${Date.now() - start}`)

    console.log("Saving weights to db...")
    const keys = Object.keys(game.players[0].q)

    const qs = []

    for (let k=0; k<keys.length; k++) {
        qs[k] = {key: keys[k]}
        Object.keys(game.players[0].q[keys[k]]).forEach(action => {
            qs[k][action] = game.players[0].q[keys[k]][action]
        })
    }

    console.log(qs.length, "states")
    db.setManyQ(qs).then(() => console.log("Done"))
    game.TEMPReset(true)

} else {
    db.countQ().then(c => console.log(`Total records count: ${c}`))
    game.players[1] = new GamePlayer("local human", 1, global.game)
    game.TEMPReset(true)
}