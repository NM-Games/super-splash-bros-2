class Rocket {
    static speed = 25;
    static impact = 18;

    player;
    x;
    y;
    direction;
    #lifespan;
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
        this.#lifespan = 1;
        this.explosion = {active: false, size: 0, a: 1};
    }

    /**
     * Update the rocket.
     * @returns {boolean} - `false` when rocket should be deleted.
     */
    update() {
        if (this.explosion.active) {
            if (this.explosion.size < 400) this.explosion.size += 15;
            else if (this.explosion.a > 0) this.explosion.a = Math.max(0, this.explosion.a - 0.014);
            else return false;
        } else {
            this.x += (this.direction === "r") ? Rocket.speed : -Rocket.speed;

            if (this.#lifespan > 0) this.#lifespan = Math.max(0, this.#lifespan - 0.006);
            else this.explode();
        }

        return true;
    }

    /** Toggle the rocket direction. */
    bounce() {
        if (this.explosion.active) return;
        this.direction = (this.direction === "l") ? "r" : "l";
    }

    /** Let the rocket explode. */
    explode() {
        this.explosion.active = true;
    }
}

module.exports = Rocket;
