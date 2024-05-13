class Splash {
    x;
    a;

    /**
     * @constructor
     * @param {number} x
     */
    constructor(x) {
        this.x = x;
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
