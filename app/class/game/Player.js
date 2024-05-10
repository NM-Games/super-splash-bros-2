class Player {
    static g = 0.6;
    static jumpForce = 12;
    static acceleration = 0.1;
    static deceleration = 1.05;
    static maxJumps = 5;
    static initialCoordinates = [
        {x: 83, y: 150},
        {x: 1103, y: 150},
        {x: 593, y: 350},
        {x: 593, y: 25},
        {x: 83, y: 50},
        {x: 1103, y: 50},
        {x: 593, y: 250},
        {x: 593, y: -75}
    ];
    static platforms = [
        {x: 15, y: 328, w: 200, h: 27}, // left
        {x: 375, y: 183, w: 500, h: 27}, // top
        {x: 250, y: 550, w: 750, h: 27}, // bottom
        {x: 1035, y: 328, w: 200, h: 27} // right
    ];

    x;
    y;
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
    keys;
    respawn;

    /**
     * @constructor
     * @param {import("../../preload/settings").Settings["appearance"]} appearance
     * @param {number | undefined} index
     */
    constructor(appearance, index) {
        const i = index ?? appearance.preferredColor;
        this.name = appearance.playerName;
        this.x = Player.initialCoordinates[i].x;
        this.y = Player.initialCoordinates[i].y;
        this.vx = 0;
        this.vy = 0;
        this.size = 64;
        this.facing = "r";
        this.lives = 3;
        this.jump = {used: 0, active: false, heldKey: false};
        this.respawn = new Date().getTime() - 5000;
        this.hit = {
            percentage: 0,
            cooldown: false,
            cooldownSince: -6e9,
        };
        this.attacks = {
            melee: {
                data: [],
                lastPerformed: -6e9
            },
            rocket: {
                data: [],
                lastPerformed: -6e9
            },
            superpower: {
                selected: appearance.superpower,
                active: false,
                lastActivated: -6e9,
            }
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

    update() {
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

        for (const platform of Player.platforms) {
            if (this.x < platform.x + platform.w && this.x + this.size > platform.x &&
             this.y < platform.y + platform.h && this.y + this.size > platform.y) {
                this.y = platform.y - this.size;
                this.jump.used = this.vy = 0;
                this.jump.active = false;
            }
        }
    }
}

module.exports = Player;
