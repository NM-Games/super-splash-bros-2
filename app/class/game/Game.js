/**
 * @typedef {import("../../preload/theme").Themes} Themes
 * @typedef {import("../../preload/settings").Settings["appearance"]} Appearance
 */

const Player = require("./Player");
const Attack = require("./Attack");
const Rocket = require("./Rocket");
const Splash = require("./Splash");
const { version } = require("../../../package.json");

class Game {
    static floodDelay = 180;

    /** @type {Themes} */
    theme;
    /** @type {Player[]} */
    players;
    /** @type {string[]} */
    ips;
    /** @type {Attack[]} */
    attacks;
    /** @type {Rocket[]} */
    rockets;
    /** @type {Splash[]} */
    splashes;
    startState;
    startedOn;
    local;
    /** @type {string[]} */
    blacklist;
    /** @type {number} */
    hostIndex;
    startPlayerCount;
    ping;

    /**
     * @constructor
     * @param {boolean} local
     */
    constructor(local = false) {
        this.theme = "";
        this.local = local;
        this.players = [null, null, null, null, null, null, null, null];
        this.ips = [null, null, null, null, null, null, null, null];
        this.attacks = [];
        this.rockets = [];
        this.splashes = [];
        this.startState = 0;
        this.startedOn = -6e9;
        this.blacklist = [];
        this.startPlayerCount = 1;
        this.ping = new Date().getTime();
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
     * Fill the game with dummy players. Only for local games.
     */
    addDummies() {
        if (!this.local) return;

        for (let i=0; i<this.players.length; i++) {
            if (this.players[i] === null) {
                this.players[i] = new Player({playerName: `Dummy ${i + 1}`, preferredColor: i, superpower: 0}, i);
                this.ips[i] = `10.0.0.${i}`;
            }
        }
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

        this.startState = 1; // enable flooding
        this.startedOn = new Date().getTime();
        this.startPlayerCount = this.getPlayers().length;
    }

    /** Update the game. */
    update() {
        this.ping = new Date().getTime();

        if (this.startState === 1 && this.ping - this.startedOn >= 3000) this.startState = 2; // disable flooding
        else if (this.startState === 2 && this.ping - this.startedOn >= 5000) this.startState = 3; // countdown '3'
        else if (this.startState === 3 && this.ping - this.startedOn >= 6000) this.startState = 4; // countdown '2'
        else if (this.startState === 4 && this.ping - this.startedOn >= 7000) this.startState = 5; // countdown '1'
        else if (this.startState === 5 && this.ping - this.startedOn >= 8000) this.startState = 6; // countdown 'GO!'

        if (this.startState < 6) return;

        for (const p1 of this.getPlayers()) {
            p1.update();

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

            if (p1.y > 700) {
                this.splashes.push(new Splash(p1.x + p1.size / 2));
                if (this.ping - p1.respawn >= p1.spawnProtection) p1.lives--;
                if (p1.lives >= 1) {
                    p1.respawn = this.ping;
                    p1.x = Player.initialCoordinates[p1.index].x;
                    p1.y = Player.initialCoordinates[p1.index].y;  
                    p1.hit.percentage = 0;
                    p1.vx = p1.vy = 0;
                }
            }

            if (p1.keys.attack && this.ping - p1.attacks.melee.lastPerformed >= p1.attacks.melee.cooldown) {
                p1.attacks.melee.lastPerformed = this.ping;
                this.attacks.push(new Attack(p1.index, p1.x + p1.size / 2, p1.y + p1.size / 2));
            }

            if (p1.keys.rocket && p1.attacks.rocket.count > 0 && this.ping - p1.attacks.rocket.lastPerformed >= p1.attacks.rocket.cooldown) {
                p1.attacks.rocket.lastPerformed = this.ping;
                p1.attacks.rocket.count--;
                this.rockets.push(new Rocket(p1.index, p1.x + Number(p1.facing === "r") * p1.size, p1.y, p1.facing));
            }
            if (this.ping - p1.attacks.rocket.lastRegenerated >= p1.attacks.rocket.regenerationInterval) {
                p1.attacks.rocket.lastRegenerated = this.ping;
                p1.attacks.rocket.count++;
            }
        }

        for (let i=0; i<this.attacks.length;) {
            const attack = this.attacks[i];
            const updateResult = attack.update();
            if (attack.canDealDamage()) {
                for (const p of this.getPlayers()) {
                    if (p.index === attack.player) continue;

                    const px = p.x + p.size / 2;
                    const py = p.y + p.size / 2;
                    const distance = Math.sqrt(Math.abs(px - attack.x) ** 2 + Math.abs(py - attack.y) ** 2);
                    
                    if (distance <= p.size / 2 + attack.size) {
                        p.damage(this.ping, 2, 5);
                        p.vx += (this.players[attack.player].x - p.x < 0 ? Attack.impact : -Attack.impact) * p.getImpactAmplifier();
                    }
                }
            }

            if (updateResult) i++;
            else this.attacks.splice(i, 1);
        }
        for (let i=0; i<this.rockets.length;) {
            const rocket = this.rockets[i];
            const updateResult = rocket.update();

            for (const p of this.getPlayers()) {
                if (rocket.player !== p.index && rocket.x < p.x + p.size && rocket.x + rocket.width > p.x && rocket.y > p.y && rocket.y < p.y + p.size && !rocket.explosion.active) {
                    p.vx += (rocket.direction === "r" ? Rocket.impact : -Rocket.impact) * p.getImpactAmplifier();
                    p.damage(this.ping, 30, 50);
                    rocket.explode();
                }
            }
            for (const platform of Player.platforms) {
                if (rocket.x < platform.x + platform.w && rocket.x + rocket.width > platform.x && rocket.y > platform.y && rocket.y < platform.y + platform.h && !rocket.explosion.active)
                    rocket.explode();
            }
            for (let j=0; j<this.rockets.length; j++) {
                const rocket2 = this.rockets[j];
                if (i === j || rocket.player === rocket2.player) continue;

                if (rocket.x < rocket2.x + rocket2.width && rocket.x + rocket.width > rocket2.x && rocket.y === rocket2.y && !rocket.explosion.active && !rocket2.explosion.active) {
                    rocket.explode();
                    rocket2.explode();
                }
            }

            if (updateResult) i++;
            else this.rockets.splice(i, 1);
        }
        for (let i=0; i<this.splashes.length;) {
            if (this.splashes[i].update()) i++;
            else this.splashes.splice(i, 1);
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
            version,
            theme: this.theme,
            host: this.hostIndex,
            ping: this.ping,
            players: this.players,
            attacks: this.attacks,
            rockets: this.rockets,
            splashes: this.splashes,
            connected,
            startedOn: this.startedOn,
            startState: this.startState,
            startPlayerCount: this.startPlayerCount
        };
    }
}

module.exports = Game;
