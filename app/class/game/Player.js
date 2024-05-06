class Player {
    x;
    y;
    vx;
    vy;
    name;
    movement;
    hit;
    lives;
    attacks;
    keys;
    respawn;

    /**
     * @constructor
     * @param {string} name
     * @param {number} superpower
     */
    constructor(name, superpower) {
        this.name = name;
        this.x = 20;
        this.y = 20;
        this.vx = 0;
        this.vy = 0;
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
                selected: superpower,
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

    update() {
        
    }
}

module.exports = Player;
