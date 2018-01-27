// node --max-old-space-size=24576 node-trainer.js -i 20000
"use strict"

const fs = require("fs")
const args = process.argv.slice(2, 12)
const {GameLogic} = require("./serverside/GameLogic.js")
const {GamePlayer} = require("./serverside/GamePlayer.js")

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
global.GameBoard = class GameBoard {
    constructor () {
        this.playerColours = []
    }
    resetBoard () {}
    addPoint () {}
    render () {}
}


const game = new GameLogic({
    span: 3,
    players: 2,
    gravityEnabled: false
})

const start = Date.now()
game.trainAI({epochs, epsilon})
console.log(`Training duration: ${Date.now() - start}`)

fs.writeFile(`./weights${epochs}.json`, JSON.stringify(game.players[1].q), (err) => {
    if (err) {
        console.log("\x1b[33mError writing weights file\x1b[0m")
    } else {
        console.log("Weights saved")
    }
})