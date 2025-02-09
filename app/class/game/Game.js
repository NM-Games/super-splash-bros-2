/**
 * @typedef {"local" | "lan" | "freeplay" | "tutorial"} Modes
 * @typedef {import("../../preload/theme").Themes} Themes
 * @typedef {import("../../file").Settings["appearance"]} Appearance
 */

const Player = require("./Player");
const Attack = require("./Attack");
const Circle = require("./Circle");
const Rocket = require("./Rocket");
const Splash = require("./Splash");
const Fish = require("./Fish");
const Exclusive = require("./Exclusive");
const PoopBomb = require("./PoopBomb");
const Geyser = require("./Geyser");
const { colors } = require("../../preload/theme");
const { version } = require("../../../package.json");

class Game {
    static floodDelay = 180;
    static floodMaxLevel = -400;

    static powerups = [{
        name: "Squash",
        /** @param {Player} p */
        condition: (p) => p.vy < -0.5,
        conditionText: "Requires player to move up",
        /** @param {Player} p */
        action: (p) => p.vy = 100
    }, {
        name: "Force Field",
        condition: () => true,
        duration: 10000
    }, {
        name: "Invisibility",
        condition: () => true,
        duration: 10000
    }, {
        name: "Knockback",
        condition: () => true,
        duration: 20000
    }, {
        name: "Power Jump",
        condition: () => true,
        duration: 20000
    }, {
        name: "Life Mender",
        /** @param {Player} p */
        condition: (p) => (p.connected && p.lives > 0 && p.lives < 5),
        conditionText: "Requires player to have less than 5 lives",
        /** @param {Player} p */
        action: (p) => p.lives = Math.min(p.lives + ((Math.random() > 0.8) ? 2 : 1), 5),
        duration: 0
    }, {
        name: "Poop Bomb",
        condition: () => true,
        /**
         * @param {Player} p
         * @param {Game} g
         */
        action: (p, g) => g.poopBombs.push(new PoopBomb(p))
   }, {
        name: "Exclusive Platform",
        /** @param {Player} p */
        condition: (p) => Math.abs(p.vy) >= 1,
        conditionText: "Requires player to be in the air",
        duration: 10000,
        /**
         * @param {Player} p
         * @param {Game} g
         */
        action: (p, g) => {
            p.exclusivePlatform = new Exclusive(p.x, p.y, p.size);
            p.vx = p.vy = 0;
        }
    }, {
        name: "Infinite Rockets",
        condition: () => true,
        /** @param {Player} p */
        action: (p) => p.attacks.rocket.count = Infinity,
        duration: 5000
    }];

    /** @type {Themes} */
    theme;
    /** @type {Player[]} */
    players;
    /** @type {string[]} */
    ips;
    /** @type {Attack[]} */
    attacks;
    /** @type {Circle[]} */
    circles;
    /** @type {Rocket[]} */
    rockets;
    /** @type {Splash[]} */
    splashes;
    /** @type {PoopBomb[]} */
    poopBombs;
    /** @type {Geyser[]} */
    geysers;
    fish;
    spawnCoordinates;
    startState;
    startedOn;
    endedOn;
    mode;
    /** These two below apply to Freeplay mode only! */
    dummyDifficulty;
    chaosPowerupsGranted;
    /** @type {string[]} */
    blacklist;
    /** @type {number} */
    hostIndex;
    startPlayerCount;
    floodLevel;
    elapsed;
    /** @type {null | number} */
    winner;
    ping;

    /**
     * @constructor
     * @param {Modes} mode
     */
    constructor(mode) {
        this.theme = "";
        this.mode = mode;
        this.players = new Array(8).fill(null);
        this.ips = new Array(8).fill(null);
        this.attacks = [];
        this.circles = [];
        this.rockets = [];
        this.splashes = [];
        this.poopBombs = [];
        this.geysers = [];
        this.fish = {
            /** @type {Fish | null} */
            item: null,
            spawned: false,
            lastSpawned: false
        };
        if (mode === "freeplay") {
            this.dummyDifficulty = 0;
            this.chaosPowerupsGranted = false;
        }
        this.startState = 0;
        this.startedOn = -6e9;
        this.endedOn = -6e9;
        this.blacklist = [];
        this.startPlayerCount = 1;
        this.floodLevel = 0;
        this.elapsed = 0;
        this.winner = null;
        this.ping = new Date().getTime();

        if (mode === "tutorial") {
            this.spawnCoordinates = new Array(8).fill({x: -1e8, y: -1e8});
            this.tutorialPhase = 0;

            const playerIndex = 0;
            const enemyIndex = 2;
            this.join({playerName: "You", preferredColor: playerIndex, powerup: 0}, "tutorial::player");
            this.join({playerName: "Enemy", preferredColor: enemyIndex, powerup: 0}, "tutorial::dummy");
            this.spawnCoordinates[playerIndex] = {x: 593, y: 350};
            this.spawnCoordinates[enemyIndex] = {x: 593, y: -25};

            this.players[playerIndex].x = this.spawnCoordinates[playerIndex].x;
            this.players[playerIndex].y = this.spawnCoordinates[playerIndex].y;
            this.players[playerIndex].lives = 1;
            this.players[playerIndex].attacks.rocket.count = 0;
            
            this.players[enemyIndex].x = this.spawnCoordinates[enemyIndex].x;
            this.players[enemyIndex].y = -5e3;
            this.players[enemyIndex].lives = 3;
            this.players[enemyIndex].attacks.rocket.count = 0;
            
            this.hostIndex = playerIndex;
        } else {
            this.spawnCoordinates = [
                {x: 393, y: 25},
                {x: 593, y: -25},
                {x: 793, y: 75},
                {x: 353, y: 450},
                {x: 593, y: 350},
                {x: 833, y: 400},
                {x: 83, y: 250},
                {x: 1103, y: 250}
            ].map(x => ({x, sortKey: Math.random()}))
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(({x}) => x);
        }
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
                    this.players[i] = new Player(appearance, i, this.spawnCoordinates, this.mode);
                    this.ips[i] = ip;
                    success = i;
                    break;
                }
            }
            return success;
        } else {
            this.players[appearance.preferredColor] = new Player(appearance, undefined, this.spawnCoordinates, this.mode);
            this.ips[appearance.preferredColor] = ip;
            if (ip.includes("127.0.0.1")) this.hostIndex = appearance.preferredColor;
        }

        return appearance.preferredColor;
    }

    /**
     * Fill the game with dummy players. Only for freeplay games.
     */
    addDummies() {
        if (this.mode !== "freeplay") return;

        for (let i=0; i<this.players.length; i++) {
            if (this.players[i] === null) {
                this.join({
                    playerName: `Dummy ${i + 1}`,
                    preferredColor: i,
                    powerup: Math.floor(Math.random() * Game.powerups.length)
                }, `dummy::${i}`);
            }
        }
    }

    /**
     * Ban a player from the game, based on his IP address.
     * @param {number} index
     */
    ban(index) {
        if (index === this.hostIndex) return;

        this.blacklist.push(this.ips[index]);
        if (this.players[index] !== null) this.players[index] = this.ips[index] = null;
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

        this.startState = 1; // enable flooding effect
        this.startedOn = new Date().getTime();
        this.startPlayerCount = this.getPlayers().length;
        Fish.frequency = (this.players.length - this.startPlayerCount) * 3000 + 15000;
    }

    /** Update the game. */
    update() {
        this.ping = new Date().getTime();

        if (this.startState === 0 && this.mode === "local") {
            for (const p of this.getPlayers()) {
                if (p.keys.left) p.facing = "l";
                else if (p.keys.right) p.facing = "r";
            }
        } else if (this.startState === 1 && this.ping - this.startedOn >= 3000) { // disable flooding effect
            this.startState = 2;
            if (this.mode === "local") {
                for (let i=0; i<this.players.length; i++) {
                    if (this.players[i] !== null && !this.players[i].connected) this.players[i] = this.ips[i] = null;
                }
                this.startPlayerCount = this.getPlayers().length;
            }
        } else if (this.startState === 2 && this.ping - this.startedOn >= 5000) this.startState = 3; // countdown '3'
        else if (this.startState === 3 && this.ping - this.startedOn >= 6000) this.startState = 4; // countdown '2'
        else if (this.startState === 4 && this.ping - this.startedOn >= 7000) this.startState = 5; // countdown '1'
        else if (this.startState === 5 && this.ping - this.startedOn >= 8000) { // countdown 'GO!'
            this.startState = 6;
            for (const p of this.getPlayers()) p.attacks.rocket.lastRegenerated = this.ping;
        } else if (this.startState === 6 && this.winner !== null) this.startState = 7; // 'you win' or 'you lose'
        else if (this.startState === 7 && this.ping - this.endedOn >= 10000) this.startState = 8; // enable flooding effect

        if (this.startState < 6) return;

        this.elapsed = this.ping - this.startedOn - 8900;
        if (this.elapsed >= Game.floodDelay * 1000) this.floodLevel = Math.max(Game.floodMaxLevel, this.floodLevel - 0.1);
        if (this.elapsed % 30000 < 15000 && this.dummyDifficulty === 4 && !this.chaosPowerupsGranted) {
            this.chaosPowerupsGranted = true;
            for (const p of this.getPlayers()) p.powerup.available = (p.lives > 0);
        } else if (this.elapsed % 30000 > 15000 && this.dummyDifficulty === 4) this.chaosPowerupsGranted = false;

        const alive = [];
        for (let i=0; i<this.players.length; i++) {
            if (this.mode === "freeplay" && this.ips[i] && this.ips[i].startsWith("dummy")) continue;
            alive.push(this.players[i] !== null && this.players[i].lives > 0 && this.players[i].connected);
        }
        if (alive.filter(x => x).length === 1 && this.endedOn < 0 && this.mode !== "freeplay") {
            this.endedOn = this.ping;
            this.winner = alive.indexOf(true);
        } else if (alive.filter(x => x).length === 0 && this.endedOn < 0 && this.mode === "freeplay") {
            this.endedOn = this.ping;
            this.winner = -1;
        }

        for (const p1 of this.getPlayers()) {
            p1.update();

            for (const p2 of this.getPlayers()) {
                if (p1.index === p2.index) continue;

                if (p1.x < p2.x + p2.size && p1.x + p1.size > p2.x &&
                 p1.y < p2.y + p2.size && p1.y + p1.size > p2.y) {
                    p1.vx /= 1.06;
                    p2.vx /= 1.06;
                    if (p1.vy < -1 && p2.vy < -1) {
                        p1.vy /= 1.05;
                        p2.vy /= 1.05;
                    }
                }

                if ((this.dummyDifficulty === 4 || (this.dummyDifficulty > 0 && this.hostIndex === p2.index)) && this.hostIndex !== p1.index) {
                    const distance = Math.sqrt(Math.abs(p1.x - p2.x) ** 2 + Math.abs(p1.y - p2.y) ** 2);
                    if (distance < this.dummyDifficulty * 50) p1.keys.attack = true; // 50 (easy), 100 (normal), 150 (hard), 200 (CHAOS)
                }
            }

            if (p1.y > 625 + this.floodLevel) {
                this.splashes.push(new Splash(p1.x + p1.size / 2, this.floodLevel));
                if (this.ping - p1.respawn >= p1.spawnProtection && this.winner === null) {
                    p1.lives--;
                    p1.hit.percentage = 0;
                    p1.respawn = this.ping;
                    p1.powerup.available = p1.powerup.active = false;
                    p1.stats.timesSplashed++;

                    if (this.mode === "tutorial") {
                        if (this.hostIndex === p1.index) p1.lives = 1;
                        else this.tutorialPhase++;
                    }
                }
                if (p1.lives >= 1) {
                    const respawnCoordinates = (this.floodLevel < 0) ? {
                        x: Math.random() * 400 + 393,
                        y: -50
                    } : this.spawnCoordinates[p1.index];

                    p1.x = respawnCoordinates.x;
                    p1.y = respawnCoordinates.y;
                    p1.vx = p1.vy = 0;
                }
            }

            if (p1.lives === 0) continue;
            if (p1.keys.attack && this.ping - p1.attacks.melee.lastPerformed >= p1.attacks.melee.cooldown && !(this.mode === "tutorial" && this.tutorialPhase !== 1)) {
                p1.attacks.melee.lastPerformed = this.ping;
                p1.stats.meleeAttacks++;
                this.attacks.push(new Attack(p1.index, p1.x + p1.size / 2, p1.y + p1.size / 2));
                this.circles.push(new Circle({
                    color: colors.players[p1.index],
                    x: p1.x + p1.size / 2,
                    y: p1.y + p1.size / 2,
                    va: 0.02,
                    vr: 5,
                    r: Attack.maxSize
                }));
                for (let i=0; i<3; i++) {
                    this.circles.push(new Circle({
                        color: colors.players[p1.index],
                        x: p1.x + p1.size / 2,
                        y: p1.y + p1.size / 2,
                        va: 0.01,
                        a0: 0.5,
                        vr: 12 + i * 6,
                        lineWidth: 15
                    }));
                    if (!p1.hasPowerup(Player.powerup.KNOCKBACK)) break;
                }
            }

            if (this.dummyDifficulty > 0 && this.hostIndex !== p1.index) {
                if (this.dummyDifficulty === 1 && Math.random() < 0.003) p1.keys.rocket = true;
                else if (this.dummyDifficulty === 2) {
                    if (Math.random() < 0.01 && Math.abs(p1.y - this.players[this.hostIndex].y) < 20) p1.keys.rocket = true;
                    p1.keys.jump = (p1.y > 600);
                    p1.keys.left = (p1.x > Player.platforms[2].x + Player.platforms[2].w);
                    p1.keys.right = (p1.x < Player.platforms[2].x);
                } else if (this.dummyDifficulty === 3) {
                    p1.facing = (p1.x > this.players[this.hostIndex].x) ? "l" : "r";
                    if (Math.random() < 0.02 && Math.abs(p1.y - this.players[this.hostIndex].y) < 20) p1.keys.rocket = true;
                    p1.keys.jump = (this.rockets.filter(r => Math.abs(p1.y - r.y) < p1.size / 2).length > 0 || p1.y > 600);
                    p1.keys.left = (p1.x > Player.platforms[1].x + Player.platforms[1].w && p1.y < 500);
                    p1.keys.right = (p1.x < Player.platforms[1].x && p1.y < 500);
                } else if (this.dummyDifficulty === 4) {
                    if (Math.random() < 0.002 || p1.hasPowerup(Player.powerup.INFINITE_ROCKETS)) p1.keys.rocket = true;
                    p1.keys.jump = (Math.random() < 0.008);
                    p1.keys.left = (
                        (p1.x > Player.platforms[1].x + Player.platforms[1].w && p1.y < 500) ||
                        (this.attacks.filter(a => a.player === p1.index).length > 0 && p1.x > 625)
                    );
                    p1.keys.right = (
                        (p1.x < Player.platforms[1].x && p1.y < 500) ||
                        (this.attacks.filter(a => a.player === p1.index).length > 0 && p1.x < 625)
                    );
                    p1.keys.powerup = (Math.random() < 0.012);
                }
            }

            const wantsToFireRocket = (p1.keys.rocket || p1.hasPowerup(Player.powerup.INFINITE_ROCKETS));
            const rocketCooldown = p1.hasPowerup(Player.powerup.INFINITE_ROCKETS) ? 200 : p1.attacks.rocket.cooldown;
            if (wantsToFireRocket && p1.attacks.rocket.count > 0 && this.ping - p1.attacks.rocket.lastPerformed >= rocketCooldown) {
                p1.attacks.rocket.lastPerformed = this.ping;
                p1.attacks.rocket.count--;
                p1.stats.rocketsFired++;
                this.rockets.push(new Rocket(p1.index, p1.x + Number(p1.facing === "r") * p1.size, p1.y, p1.facing));
            }
            if (this.ping - p1.attacks.rocket.lastRegenerated >= p1.attacks.rocket.regenerationInterval && p1.attacks.rocket.count < Player.maxRockets) {
                p1.attacks.rocket.lastRegenerated = this.ping;
                p1.attacks.rocket.count++;
            } else if (p1.attacks.rocket.count === Player.maxRockets) p1.attacks.rocket.lastRegenerated = this.ping;

            if (this.fish.item) {
                if (p1.x < this.fish.item.x + Fish.width && p1.x + p1.size > this.fish.item.x && this.fish.item.takeable &&
                 p1.y < this.fish.item.y + Fish.height && p1.y + p1.size > this.fish.item.y && !p1.powerup.available && !p1.powerup.active) {
                    if (this.fish.item.takenBy === -1) this.fish.item.takenBy = p1.index;
                    if (this.fish.item.takenBy === p1.index) this.fish.item.collidesWithTaker = true;
                    this.fish.item.collides = true;
                } else if (this.fish.item.takenBy === p1.index) this.fish.item.collides = this.fish.item.collidesWithTaker = false;
            }

            p1.powerup.meetsCondition = Game.powerups[p1.powerup.selected].condition(p1);
            if (p1.keys.powerup && p1.powerup.available && !p1.powerup.active && p1.powerup.meetsCondition) {
                p1.powerup.available = false;
                p1.powerup.active = true;
                p1.powerup.lastActivated = this.ping;
                if (Game.powerups[p1.powerup.selected].action) Game.powerups[p1.powerup.selected].action(p1, this);
            }
            if (p1.powerup.active) {
                if (!Game.powerups[p1.powerup.selected].duration && p1.powerup.selected !== Player.powerup.SQUASH)
                    p1.powerup.active = false;
                else if (this.ping - p1.powerup.lastActivated >= Game.powerups[p1.powerup.selected].duration)
                    p1.powerup.active = false;

                if (p1.powerup.active && p1.powerup.selected === Player.powerup.SQUASH && p1.ly === p1.y) {
                    p1.powerup.active = false;
                    p1.damage(this.ping, 60, 95);
                    this.circles.push(new Circle({x: p1.x + p1.size / 2, y: p1.y + p1.size / 2, color: colors.squash, vr: 15, va: 0.009, shake: true}));
                    for (const p2 of this.getPlayers())
                        p2.damage(this.ping, 40, 80, (p1.index === p2.index) ? 0 : (p1.x < p2.x) ? 15 : -15);
                    if (Math.random() >= 0.85) {
                        for (let i=0; i<2; i++) this.geysers.push(new Geyser(i * 1250));
                    }
                }
            } else if (!isFinite(p1.attacks.rocket.count)) {
                p1.attacks.rocket.count = 0;
                p1.attacks.rocket.lastRegenerated = this.ping;
            }
        }

        for (let i=0; i<this.attacks.length;) {
            if (this.attacks[i].update(this)) i++;
            else this.attacks.splice(i, 1);
        }
        for (let i=0; i<this.circles.length;) {
            if (this.circles[i].update()) i++;
            else this.circles.splice(i, 1);
        }
        for (let i=0; i<this.rockets.length;) {
            const rocket = this.rockets[i];
            const updateResult = rocket.update();
            if (!rocket.explosion.active) this.circles.push(new Circle({
                color: colors.players[rocket.player],
                x: rocket.x + rocket.width / 2,
                y: rocket.y,
                r0: 4,
                vr: 0.4,
                va: 0.015
            }));
            for (const p of this.getPlayers()) {
                if (rocket.x < p.x + p.size && rocket.x + rocket.width > p.x && rocket.y > p.y && rocket.y < p.y + p.size
                 && !rocket.explosion.active && this.ping - p.respawn >= p.spawnProtection) {
                    if (p.ly + p.size <= rocket.y) { // rocket ride if landed on top
                        p.x += (rocket.direction === "r" ? Rocket.speed : -Rocket.speed) * 2;
                        p.vx = 0;
                        p.y = rocket.y - p.size;
                        p.jump.used = p.vy = 0;
                        p.jump.active = false;
                    } else if (p.hasPowerup(Player.powerup.FORCE_FIELD)) {
                        rocket.bounce();
                    } else {
                        p.damage(this.ping, 30, 50, (rocket.direction === "r" ? Rocket.impact : -Rocket.impact));
                        rocket.explode();
                    }
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
            if (this.fish.item && rocket.x < this.fish.item.x + Fish.width && rocket.x + rocket.width > this.fish.item.x && rocket.y > this.fish.item.y && rocket.y < this.fish.item.y + Fish.height && !rocket.explosion.active)
                rocket.bounce();

            if (updateResult) i++;
            else this.rockets.splice(i, 1);
        }
        for (let i=0; i<this.splashes.length;) {
            if (this.splashes[i].update()) i++;
            else this.splashes.splice(i, 1);
        }
        for (let i=0; i<this.poopBombs.length;) {
            if (this.poopBombs[i].update(625 + this.floodLevel)) i++; else {
                this.geysers.push(new Geyser(this.poopBombs[i].x));
                this.poopBombs.splice(i, 1);
            }
        }
        for (let i=0; i<this.geysers.length;) {
            const geyser = this.geysers[i];
            const updateResult = geyser.update();

            for (const p of this.getPlayers()) {
                if (p.x < geyser.x + Geyser.width && p.x + p.size > geyser.x && p.y + p.size > geyser.y && !p.hasPowerup(Player.powerup.FORCE_FIELD)) {
                    p.y -= Geyser.speed;
                    p.damage(this.ping, 1.2, 2.5);
                }
            }

            if (updateResult) i++;
            else this.geysers.splice(i, 1);
        }

        if ((this.elapsed + Fish.start) % Fish.frequency < 1000 && !this.fish.spawned && this.startState <= 6 && this.dummyDifficulty !== 4) {
            this.fish.spawned = true;
            this.fish.item = new Fish(this.elapsed);
        } else this.fish.spawned = false;
        if (this.fish.item && !this.fish.item.update(this.elapsed)) {
            if (this.fish.item.takeValue === 1) {
                this.players[this.fish.item.takenBy].powerup.available = true;
                this.players[this.fish.item.takenBy].stats.fishCollected++;
                this.circles.push(new Circle({
                    color: colors.ui.primary,
                    x: this.fish.item.x + Fish.width / 2,
                    y: this.fish.item.y + Fish.height / 2,
                    vr: 19,
                    va: 0.03
                }));
            }
            this.fish.item = null;
        }
        if (this.mode === "tutorial") {
            this.floodLevel = 0;
            this.fish.item = null;
            this.players[this.hostIndex].attacks.rocket.cooldown = 1000;
            Player.maxRockets = 0;

            if (this.tutorialPhase === 0) { // free phase
                this.players[this.hostIndex].attacks.rocket.count = 0;
                for (const p of this.getPlayers()) {
                    if (p.index !== this.hostIndex) {
                        p.vy = 2;
                        if (p.y > -500) this.tutorialPhase = 1;
                    }
                }
            } else if (this.tutorialPhase === 1) { // melee attack phase
                this.players[this.hostIndex].attacks.rocket.count = 0;
            } else if (this.tutorialPhase === 2) { // rocket phase
                this.players[this.hostIndex].attacks.rocket.count = Infinity;
            } else if (this.tutorialPhase === 3) { // power-up phase
                this.players[this.hostIndex].attacks.rocket.count = 0;
                if (this.ping - this.players[this.hostIndex].powerup.lastActivated > 1000) this.players[this.hostIndex].powerup.available = true;
            }
        }

        for (const p of this.getPlayers()) {
            p.updateCoordinates();
            if (this.dummyDifficulty > 0 && this.hostIndex !== p.index) p.keys.attack = p.keys.rocket = false;
        }
    }

    /** Export the game to clients. */
    export() {
        let connected = 0;
        for (const p of this.players) {
            if (p !== null && p.connected) connected++;
        }
        const remaining = Math.floor((this.endedOn > 0 ? 10000 - (this.ping - this.endedOn) : Game.floodDelay * 1000 - this.elapsed) / 1000);

        return {
            act: "update",
            version,
            theme: this.theme,
            host: this.hostIndex,
            ping: this.ping,
            players: this.players,
            attacks: this.attacks,
            circles: this.circles,
            rockets: this.rockets,
            splashes: this.splashes,
            poopBombs: this.poopBombs,
            geysers: this.geysers,
            fish: this.fish,
            connected,
            startedOn: this.startedOn,
            startState: this.startState,
            startPlayerCount: this.startPlayerCount,
            elapsed: this.elapsed,
            winner: this.winner,
            floodLevel: this.floodLevel,
            flooded: (this.floodLevel === Game.floodMaxLevel),
            banCount: this.blacklist.length,
            remaining
        };
    }
}

module.exports = Game;
