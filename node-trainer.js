// node --max-old-space-size=24576 node-trainer.js -i 20000
"use strict"

global.readline = require("readline")
const fs = require("fs")
const args = process.argv.slice(2, 12)
const {GameLogic} = require("./serverside/GameLogic.js")
const {GamePlayer} = require("./serverside/GamePlayer.js")

let existingData
existingData = JSON.parse(fs.readFileSync("./weights200000.json"))
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

if (!existingData) {
    // const start = Date.now()
    // game.trainAI({epochs, epsilon})
    // console.log(`Training duration: ${Date.now() - start}`)

    // console.log("Saving weights to file...")
    // fs.writeFile(`./weights${epochs}.json`, JSON.stringify(game.players[1].q), (err) => {
    //     if (err) {
    //         console.log("\x1b[33mError writing weights file\x1b[0m")
    //     } else {
    //         console.log("Weights saved")
    //     }
    // })

    // game.TEMPReset()

} else {
    game.players[1].q = existingData
    game.TEMPReset()
}