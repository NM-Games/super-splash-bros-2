class Rocket {
    static speed = 25;

    player;
    x;
    y;
    direction;
    trail;
    explosion;

    /**
     * @constructor
     * @param {number} index
     * @param {number} x
     * @param {number} y
     * @param {"l" | "r"} direction
     */
    constructor(index, x, y, direction) {
        this.player = index;
        this.x = x;
        this.y = y + 48;
        this.width = 40;
        this.direction = direction;
        this.trail = {startX: x, a: 1};
        this.explosion = {active: false, size: 0, a: 1};

        if (this.direction === "l") this.x -= this.width;
    }

    /**
     * Update the rocket.
     * @returns {boolean} - `false` when rocket should be deleted.
     */
    update() {
        if (this.explosion.active) {
            this.trail.a = Math.max(0, this.trail.a - 0.02);

            if (this.explosion.size < 400) this.explosion.size += 15;
            else if (this.explosion.a > 0) this.explosion.a = Math.max(0, this.explosion.a - 0.014);
            else return false;
        } else {
            this.x += (this.direction === "r") ? Rocket.speed : -Rocket.speed;

            if (this.trail.a > 0) this.trail.a = Math.max(0, this.trail.a - 0.006);
            else this.explode();
        }

        return true;
    }

    explode() {
        this.explosion.active = true;
    }
}

module.exports = Rocket;
