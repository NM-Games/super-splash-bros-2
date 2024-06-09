const { g } = require("./Player");

class PoopBomb {
    static speed = 4;
    static launch = 12;

    x;
    y;
    vx;
    vy;
    player;

    /**
     * @constructor
     * @param {import("./Player")} p
     */
    constructor(p) {
        this.x = p.x + (p.facing === "l" ? p.size : 0);
        this.y = p.y;
        this.vx = (p.facing === "l") ? PoopBomb.speed : -PoopBomb.speed;
        this.vy = -PoopBomb.launch;
        this.player = p.index;
    }

    /**
     * Update the poop bomb.
     * @param {number} threshold
     * @returns {boolean} - `false` when the poop bomb should be deleted, `true` otherwise.
     */
    update(threshold) {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += g;

        return (this.y <= threshold);
    }
}

module.exports = PoopBomb;