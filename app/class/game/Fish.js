class Fish {
    x;
    y;
    vy;
    t;

    static start = 3000;
    static frequency = 10000;
    static hideDelay = 5000;

    /**
     * @param {number} t
     * @constructor
     */
    constructor(t) {
        this.x = 20;
        this.y = 800;
        this.vy = -(Math.random() * 2 + 70);
        this.t = t;
    }

    /**
     * Update the fish.
     * @param {number} elapsed
     * @param {number} index
     * @returns {boolean} - `false` when the fish should be deleted.
     */
    update(elapsed) {
        let keep = true;

        this.y += this.vy;
        if (elapsed - this.t >= Fish.hideDelay) {
            this.vy += 0.7;
            if (this.y >= 800) keep = false;
        } else {
            this.vy /= 1.1;
        }
        return keep;
    }
}

module.exports = Fish;
