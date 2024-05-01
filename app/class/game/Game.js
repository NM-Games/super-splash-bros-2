const Player = require("./Player");

class Game {
    /** @type {Player[]} */
    players;
    started;
    startedOn;

    constructor() {
        this.players = [null, null, null, null, null, null, null, null];
        this.started = false;
        this.startedOn = -6e9;
    }

    join(name, color, superpower) {
        if (this.players[color]) {
            let success = false;
            for (let i=0; i<this.players.length; i++) {
                if (!this.players[i]) {
                    this.players[i] = new Player(name, superpower);
                    success = true;
                    break;
                }
            }
            return success;
        } else this.players[color] = new Player(name, superpower);

        return true;
    }

    update() {
        
    }
}

module.exports = Game;
