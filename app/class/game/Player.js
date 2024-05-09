class Player {
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

    x;
    y;
    vx;
    vy;
    size;
    /** @type {"l" | "r"} */
    facing;
    name;
    movement;
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
        this.respawn = new Date().getTime() - 5000;
        this.movement = {
            up: false,
            left: false,
            right: false
        };
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
        
    }
}

module.exports = Player;
