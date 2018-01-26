"use strict"

class GamePlayer {

    constructor (type, playerIndex) {

        console.log(`new ${type} player: ${playerIndex}`)

        this.type = type
    }

    getQ () {

    }

    pickMove () {

        if (this.type != "AI") return

    }

    reward () {

        if (this.type != "AI") return

    }

}