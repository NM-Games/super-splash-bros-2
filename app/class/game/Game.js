/**
 * @typedef {import("../../preload/theme").Themes} Themes
 * @typedef {import("../../preload/settings").Settings["appearance"]} Appearance
 */

const Player = require("./Player");
const Rocket = require("./Rocket");
const { version } = require("../../../package.json");

class Game {
    static floodDelay = 180;

    /** @type {Themes} */
    theme;
    /** @type {Player[]} */
    players;
    /** @type {string[]} */
    ips;
    /** @type {Rocket[]} */
    rockets;
    startState;
    startedOn;
    /** @type {string[]} */
    blacklist;
    hostIndex;
    ping;

    /**
     * @constructor
     * @param {Themes} theme 
     */
    constructor() {
        this.theme = "";
        this.players = [null, null, null, null, null, null, null, null];
        this.ips = [null, null, null, null, null, null, null, null];
        this.rockets = [];
        this.startState = 0;
        this.startedOn = -6e9;
        this.blacklist = [];
    }

    /**
     * Let a player join the game.
     * @param {Appearance} appearance
     * @param {string} ip
     * @returns {number}
     */
    join(appearance, ip) {
        if (this.players[appearance.preferredColor] !== null) {
            let success = -1;
            for (let i=0; i<this.players.length; i++) {
                if (this.players[i] === null) {
                    this.players[i] = new Player(appearance, i);
                    this.ips[i] = ip;
                    success = i;
                    break;
                }
            }
            return success;
        } else {
            this.players[appearance.preferredColor] = new Player(appearance);
            this.ips[appearance.preferredColor] = ip;
            if (ip.includes("127.0.0.1")) this.hostIndex = appearance.preferredColor;
        }

        return appearance.preferredColor;
    }

    /**
     * Remove a player from the game. Note that this does not equal kicking, this game only has banning!
     * @param {number} index
     */
    remove(index) {
        if (this.players[index] !== null) this.players[index] = this.ips[index] = null;
    }

    /**
     * Ban a player from the game, based on his IP address.
     * @param {number} index
     */
    ban(index) {
        if (index === this.hostIndex) return;

        this.blacklist.push(this.ips[index]);
        this.remove(index);
    }

    /**
     * Get all the players in a game, without `null` values.
     * @returns {Player[]}
     */
    getPlayers() {
        const output = [];
        for (const p of this.players) {
            if (p !== null) output.push(p);
        }
        return output;
    }

    /** Start the game. */
    start() {
        if (this.startState > 0) return;

        this.startState = 1;
        this.startedOn = new Date().getTime();
    }

    /** Update the game. */
    update() {
        this.ping = new Date().getTime();
        for (const p of this.getPlayers()) p.update();

        if (this.startState === 1 && this.ping - this.startedOn >= 3000) this.startState = 2;
        else if (this.startState === 2 && this.ping - this.startedOn >= 5000) this.startState = 3;

        for (const p1 of this.getPlayers()) {
            for (const p2 of this.getPlayers()) {
                if (p1.index === p2.index) continue;

                if (p1.x < p2.x + p2.size && p1.x + p1.size > p2.x &&
                 p1.y < p2.y + p2.size && p1.y + p1.size > p2.y) {
                    console.warn("kaboomski");
                    if (p1.lx + p1.size <= p2.x) {
                        if (Math.abs(p1.vx) >= Math.abs(p2.vx)) p2.x = p1.x + p1.size;
                        else p1.x = p2.x + p2.size;
                        p1.vx /= 1.1;
                    } else if (p1.lx >= p2.x + p2.size) {
                        if (Math.abs(p1.vx) >= Math.abs(p2.vx)) p2.x = p1.x - p1.size;
                        else p1.x = p2.x - p2.size;
                        p1.vx /= 1.1;
                    } else if (p1.ly + p1.size <= p2.y) {
                        p1.y = p2.y - p2.size;
                        p1.vy = p1.jump.used = 0;
                        p1.jump.active = false;
                    } else if (p2.jump.active) {
                        p1.y = p2.y - p2.size;
                    }
                }
            }

            if (p1.keys.rocket && p1.attacks.rocket.count > 0 && this.ping - p1.attacks.rocket.lastPerformed >= p1.attacks.rocket.cooldown) {
                p1.attacks.rocket.lastPerformed = this.ping;
                p1.attacks.rocket.count--;
                this.rockets.push(new Rocket(p1.index, p1.x, p1.y, p1.facing));
            }
        }

        for (const rocket of this.rockets) {
            rocket.update();
            for (const p of this.getPlayers()) {
                if (rocket.player !== p.index && rocket.x < p.x + p.size && rocket.x + rocket.width > p.x && rocket.y > p.y && rocket.y < p.y + p.size)
                 rocket.explode();
            }
        }

        for (const p of this.getPlayers()) p.updateCoordinates();
    }

    /** Export the game to clients. */
    export() {
        let connected = 0;
        for (const p of this.players) {
            if (p !== null) connected++;
        }

        return {
            act: "update",
            theme: this.theme,
            host: this.hostIndex,
            version,
            players: this.players,
            rockets: this.rockets,
            connected,
            startState: this.startState
        };
    }
}

module.exports = Game;
