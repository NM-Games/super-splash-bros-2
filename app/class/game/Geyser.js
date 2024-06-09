class Geyser {
    static width = 300;
    static speed = 50;

    x;
    y;
    a;

    /**
     * @constructor
     * @param {number} cx
     */
    constructor(cx) {
        this.x = cx - Geyser.width / 2;
        this.y = 700;
        this.a = 1;
    }

    /**
     * Update the geyser.
     * @returns {boolean} - `false` when the geyser should be deleted, `true` otherwise.
     */
    update() {
        this.y -= Geyser.speed;
        if (this.y < -500) this.a = Math.max(0, this.a - 0.012);

        return (this.a > 0);
    }
}

module.exports = Geyser;
