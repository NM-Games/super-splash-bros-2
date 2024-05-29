class Splash {
    x;
    h;
    a;

    /**
     * @constructor
     * @param {number} x
     * @param {number} h
     */
    constructor(x, h) {
        this.x = x;
        this.h = h;
        this.a = 1;
    }

    /**
     * Update the splash.
     * @returns {boolean} - `false` if splash should be deleted.
     */
    update() {
        this.a -= 0.008;
        return (this.a >= 0);
    }
}

module.exports = Splash;
