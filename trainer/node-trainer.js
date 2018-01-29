// node --max-old-space-size=24576 node-trainer.js -i 20000
"use strict"

global.readline = require("readline")
const fs = require("fs")
const args = process.argv.slice(2, 12)
const {GameLogic} = require("./GameLogic.js")
const {GamePlayer} = require("./GamePlayer.js")
const db = require("../game-MongoDB")

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
            console.log(
`
 ${gameState[0][0][0]} | ${gameState[0][0][1]} | ${gameState[0][0][2]}
 __________
 ${gameState[0][1][0]} | ${gameState[0][1][1]} | ${gameState[0][1][2]}
 __________
 ${gameState[0][2][0]} | ${gameState[0][2][1]} | ${gameState[0][2][2]}
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

if (doTraining) {
    const start = Date.now()
    game.trainAI({epochs, epsilon})
    console.log(`Training duration: ${Date.now() - start}`)

    console.log("Saving weights to db...")
    const keys = Object.keys(game.players[0].q)

    const qs = []

    for (let k=0; k<keys.length; k++) {
        qs[k] = {key: keys[k], value: game.players[0].q[keys[k]]}
    }

    db.setManyQ(qs).then(() => console.log("Done"))
    game.TEMPReset(true)

} else {
    db.deleteAllQ()
    db.countQ().then(c => console.log(`Total count: ${c}`))


    // db.updateQ('1                          001', 20) // 0.97
    // db.getAllQ().then(data => {

    //     console.log("data.length", data.length)
    //     console.log(data[0])
    //     console.log(data.find(r => r.key == '1                          001'))

        game.TEMPReset(true)
    // })
}