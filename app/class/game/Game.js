const Player = require("./Player");
const { version } = require("../../../package.json");

class Game {
    /** @type {Player[]} */
    players;
    /** @type {string[]} */
    ips;
    started;
    startedOn;
    /** @type {string[]} */
    blacklist;

    constructor() {
        this.players = [null, null, null, null, null, null, null, null];
        this.ips = [null, null, null, null, null, null, null, null];
        this.started = false;
        this.startedOn = -6e9;
        this.blacklist = [];
    }

    /**
     * Let a player join the game.
     * @param {import("../../preload/settings").Settings["appearance"]} appearance
     * @param {string} ip
     * @returns {number}
     */
    join(appearance, ip) {
        if (this.players[appearance.preferredColor] !== null) {
            let success = -1;
            for (let i=0; i<this.players.length; i++) {
                if (this.players[i] === null) {
                    this.players[i] = new Player(appearance.playerName, appearance.superpower);
                    this.ips[i] = ip;
                    success = i;
                    break;
                }
            }
            return success;
        } else {
            this.players[appearance.preferredColor] = new Player(appearance.playerName, appearance.superpower);
            this.ips[appearance.preferredColor] = ip;
        }

        return appearance.preferredColor;
    }

    /**
     * Kick a player from the game.
     * @param {number} index
     */
    kick(index) {
        if (this.players[index] !== null) this.players[index] = this.ips[index] = null;
    }

    /**
     * Ban a player from the game, based on his IP address.
     * @param {number} index
     */
    ban(index) {
        this.blacklist.push(this.ips[index]);
        this.kick(index);
    }

    /** Start the game. */
    start() {
        this.started = true;
        this.startedOn = new Date().getTime();
    }

    /** Update the game. */
    update() {
        for (const p of this.players) {
            if (p === null) return;
            p.update();
        }
    }

    /** Export the game to clients. */
    export() {
        return {
            act: "update",
            version,
            players: this.players,
            started: this.started
        };
    }
}

module.exports = Game;
