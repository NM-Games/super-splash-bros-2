class Fish {
    x;
    y;
    vy;
    t;
    takeable;
    takenBy;
    takeValue;
    collidesWithTaker;

    static start = 10000;
    static frequency = 20000;
    static hideDelay = 8000;
    static increment = 0.01;

    static width = 69;
    static height = 100;

    /**
     * @param {number} t
     * @constructor
     */
    constructor(t) {
        this.x = (Math.random() >= 0.5) ? -10 : 1260 - Fish.width;
        this.y = 800;
        this.vy = -(Math.random() * 8 + 69);
        this.t = t;
        this.takeable = false;
        this.takenBy = -1;
        this.takeValue = 0;
        this.collidesWithTaker = false;
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
        this.takeable = (Math.abs(this.vy) < 0.05);
        if (elapsed - this.t >= Fish.hideDelay) {
            this.vy += 0.7;
            if (this.y >= 800) keep = false;
        } else {
            this.vy /= 1.1;
        }

        if (this.collidesWithTaker) this.takeValue = Math.min(1, this.takeValue + Fish.increment);
        else this.takeValue = Math.max(0, this.takeValue - Fish.increment / 1.5);

        if (this.takeValue === 1) keep = false;

        return keep;
    }
}

module.exports = Fish;
