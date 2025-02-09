const Exclusive = require("./Exclusive");

class Player {
    static g = 0.6;
    static jumpForce = 12;
    static acceleration = 0.1;
    static deceleration = 1.05;
    static maxJumps = 5;
    static maxRockets = 6;
    static platforms = [
        {x: 15, y: 328, w: 200, h: 27}, // left
        {x: 375, y: 183, w: 500, h: 27}, // top
        {x: 250, y: 550, w: 750, h: 27}, // bottom
        {x: 1035, y: 328, w: 200, h: 27} // right
    ];
    static powerup = {
        SQUASH: 0,
        FORCE_FIELD: 1,
        INVISIBILITY: 2,
        KNOCKBACK: 3,
        POWER_JUMP: 4,
        LIFE_MENDER: 5,
        POOP_BOMB: 6,
        EXCLUSIVE_PLATFORM: 7,
        INFINITE_ROCKETS: 8
    };

    index;
    connected;
    x;
    y;
    lx;
    ly;
    vx;
    vy;
    size;
    /** @type {"l" | "r"} */
    facing;
    jump;
    name;
    hit;
    lives;
    attacks;
    powerup;
    /** @type {Exclusive | null} */
    exclusivePlatform;
    stats;
    keys;
    respawn;
    spawnProtection;

    static generateName() {
        return "Splasher" + ("000" + Math.ceil(Math.random() * 9999)).slice(-4);
    }

    /** @returns {import("../../file").Statistics} */
    static getStatisticsTemplate() {
        return {
            gamesPlayed: new Array(8).fill(0),
            meleeAttacks: 0,
            rocketsFired: 0,
            damageTaken: 0,
            timesSplashed: 0,
            fishCollected: 0,
            traveledX: 0,
            traveledY: 0
        };
    }

    /**
     * @constructor
     * @param {import("../../file").Settings["appearance"]} appearance
     * @param {number | undefined} index
     * @param {{x: number, y: number}[]} coordinates
     * @param {import("./Game").Modes} gamemode
     */
    constructor(appearance, index, coordinates, gamemode) {
        this.index = index ?? appearance.preferredColor;
        this.connected = true;
        this.name = appearance.playerName;
        this.x = this.lx = coordinates[this.index].x;
        this.y = this.ly = coordinates[this.index].y;
        this.vx = 0;
        this.vy = 0;
        this.size = 64;
        this.facing = (Math.random() > 0.5 && gamemode !== "local") ? "l" : "r";
        this.lives = 3;
        this.jump = {used: 0, active: false, heldKey: false};
        this.spawnProtection = 5000;
        this.respawn = new Date().getTime() - this.spawnProtection;
        this.hit = {
            percentage: 0,
            last: -6e9,
            effectDuration: 400
        };
        this.attacks = {
            melee: {
                cooldown: 500,
                lastPerformed: -6e9
            },
            rocket: {
                count: 2,
                cooldown: 5000,
                regenerationInterval: 20000,
                lastRegenerated: -6e9,
                lastPerformed: -6e9
            }
        };
        this.powerup = {
            selected: appearance.powerup,
            available: false,
            active: false,
            meetsCondition: false,
            lastActivated: -6e9
        };
        this.exclusivePlatform = null;
        this.stats = Player.getStatisticsTemplate();
        this.keys = {
            left: false,
            right: false,
            jump: false,
            attack: false,
            rocket: false,
            powerup: false
        };
    }

    /**
     * Set the keys of a player.
     * @param {import("../../file").Settings["controls"]} keys
     */
    setKeys(keys) {
        this.keys.left = keys.moveLeft;
        this.keys.right = keys.moveRight;
        this.keys.jump = keys.jump;
        this.keys.attack = keys.attack;
        this.keys.rocket = keys.launchRocket;
        this.keys.powerup = keys.activatePowerup;
    }

    /**
     * Damage the player.
     * @param {number} ping
     * @param {number} min
     * @param {number} max
     * @param {number} knockback
     */
    damage(ping, min, max, knockback = 0) {
        if (ping - this.respawn < this.spawnProtection ||
         this.hasPowerup(Player.powerup.FORCE_FIELD)) return;

        const damageAmount = Math.random() * (max - min) + min;
        this.hit.last = ping;
        this.hit.percentage += damageAmount;
        this.stats.damageTaken += damageAmount;
        if (this.hit.percentage >= 500) this.hit.percentage = 500;
        this.vx += knockback * (this.hit.percentage / 80 + 1);
    }

    /**
     * Check whether a player has a specific power-up active.
     * @param {number} index
     * @returns {boolean}
     */
    hasPowerup(index) {
        return (this.powerup.active && this.powerup.selected === index);
    }

    /** Update a player. Collision detection between players is done in the Game class. */
    update() {
        if (this.lives > 0 && this.connected) {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += Player.g;

            if (this.keys.left && !this.keys.right) {
                this.facing = "l";
                this.vx -= Player.acceleration;
            } else if (!this.keys.left && this.keys.right) {
                this.facing = "r";
                this.vx += Player.acceleration;
            } else this.vx /= Player.deceleration;

            if (this.hasPowerup(Player.powerup.FORCE_FIELD)) {
                this.vx /= Player.deceleration;
                this.vy += Player.g / 2;
            }

            if (this.keys.jump && !this.jump.heldKey && this.jump.used < Player.maxJumps && !this.hasPowerup(Player.powerup.SQUASH)) {
                this.jump.active = true;
                this.jump.used++;
                this.y -= 2;
                this.vy = -Player.jumpForce * (this.hasPowerup(Player.powerup.POWER_JUMP) ? 1.5 : 1);
            }
            this.jump.heldKey = this.keys.jump;

            this.stats.traveledX += Math.abs(this.lx - this.x);
            this.stats.traveledY += Math.abs(this.ly - this.y);
        } else this.x = this.y = -1e8;

        for (const platform of Player.platforms) {
            if (this.x < platform.x + platform.w && this.x + this.size > platform.x &&
             this.y < platform.y + platform.h && this.y + this.size > platform.y) {
                if (this.lx + this.size <= platform.x) {
                    this.x = platform.x - this.size;
                    this.vx = 0;
                } else if (this.lx >= platform.x + platform.w) {
                    this.x = platform.x + platform.w;
                    this.vx = 0;
                } else if (platform.y + platform.h <= this.ly) {
                    this.y = platform.y + platform.h;
                    this.vy = 0;
                } else {
                    this.y = platform.y - this.size;
                    this.jump.used = this.vy = 0;
                    this.jump.active = false;
                }
            }
        }
        if (!this.powerup.active) this.exclusivePlatform = null;
        if (this.exclusivePlatform) this.exclusivePlatform.update(this);
    }

    /** Update last coordinates, used at the end of a frame update. */
    updateCoordinates() {
        this.lx = this.x;
        this.ly = this.y;
    }
}

module.exports = Player;
