class Rocket {
    static speed = 25;
    static impact = 18;

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
        this.width = 40;
        this.direction = direction;
        this.x = x - (this.direction === "l" ? this.width : 0);
        this.y = y + 48;
        this.trail = {startX: this.x, a: 1};
        this.explosion = {active: false, size: 0, a: 1};
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
