class Player {
    static g = 0.6;
    static jumpForce = 12;
    static acceleration = 0.1;
    static deceleration = 1.05;
    static maxJumps = 5;
    static initialCoordinates = [
        {x: 393, y: 350},
        {x: 393, y: 25},
        {x: 593, y: 350},
        {x: 793, y: 25},
        {x: 793, y: 350},
        {x: 593, y: 25},
        {x: 83, y: 150},
        {x: 1103, y: 150},
    ];
    static platforms = [
        {x: 15, y: 328, w: 200, h: 27}, // left
        {x: 375, y: 183, w: 500, h: 27}, // top
        {x: 250, y: 550, w: 750, h: 27}, // bottom
        {x: 1035, y: 328, w: 200, h: 27} // right
    ];

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
    superpower;
    keys;
    respawn;
    spawnProtection;

    /**
     * @constructor
     * @param {import("../../preload/settings").Settings["appearance"]} appearance
     * @param {number | undefined} index
     */
    constructor(appearance, index) {
        this.index = index ?? appearance.preferredColor;
        this.connected = true;
        this.name = appearance.playerName;
        this.x = this.lx = Player.initialCoordinates[this.index].x;
        this.y = this.ly = Player.initialCoordinates[this.index].y;
        this.vx = 0;
        this.vy = 0;
        this.size = 64;
        this.facing = "r";
        this.lives = 3;
        this.jump = {used: 0, active: false, heldKey: false};
        this.spawnProtection = 5000;
        this.respawn = new Date().getTime() - this.spawnProtection;
        this.hit = {
            percentage: 0,
            cooldown: 400,
            cooldownSince: -6e9,
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
        this.superpower = {
            selected: appearance.superpower,
            available: false,
            active: false,
            lastActivated: -6e9
        };
        this.keys = {
            left: false,
            right: false,
            jump: false,
            attack: false,
            rocket: false,
            superpower: false
        };
    }

    /**
     * Set the keys of a player.
     * @param {import("../../preload/settings").Settings["controls"]} keys
     */
    setKeys(keys) {
        this.keys.left = keys.moveLeft;
        this.keys.right = keys.moveRight;
        this.keys.jump = keys.jump;
        this.keys.attack = keys.attack;
        this.keys.rocket = keys.launchRocket;
        this.keys.superpower = keys.activateSuperpower;
    }

    /**
     * Damage the player.
     * @param {number} ping
     * @param {number} min
     * @param {number} max
     * @param {number} knockback
     */
    damage(ping, min, max, knockback = 0) {
        if (ping - this.hit.cooldownSince < this.hit.cooldown || ping - this.respawn < this.spawnProtection) return;

        this.hit.cooldownSince = ping;
        this.hit.percentage += Math.random() * (max - min) + min;
        this.vx += knockback * (this.hit.percentage / 80 + 1)
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
    
            if (this.keys.jump && !this.jump.heldKey && this.jump.used < Player.maxJumps) {
                this.jump.active = true;
                this.jump.used++;
                this.y -= 2;
                this.vy = -Player.jumpForce;
            }
            this.jump.heldKey = this.keys.jump;
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
    }

    /** Update last coordinates, used at the end of a frame update. */
    updateCoordinates() {
        this.lx = this.x;
        this.ly = this.y;
    }
}

module.exports = Player;
