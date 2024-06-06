class Circle {
    x;
    y;
    r;
    #r1;
    #vr;
    a;
    #va;
    color;
    lineWidth;
    #instantFade;
    shake;

    /**
     * @constructor
     * @param {{
     *  x: number,
     *  y: number,
     *  r0?: number,
     *  r: number,
     *  vr: number,
     *  va: number,
     *  color: string | CanvasGradient | CanvasPattern,
     *  lineWidth?: number,
     *  instantFade?: boolean,
     *  shake?: boolean
     * }} options
     */
    constructor(options) {
        this.x = options.x;
        this.y = options.y;
        this.r = options.r0 ?? 0;
        this.#r1 = options.r;
        this.#vr = options.vr;
        this.a = 1;
        this.#va = options.va;
        this.color = options.color;
        this.lineWidth = options.lineWidth ?? -1;
        this.#instantFade = options.instantFade ?? false;
        this.shake = options.shake ?? false;
    }

    /**
     * Updates the circle. Returns `false` if it should be deleted, `true` otherwise.
     * @returns {boolean}
     */
    update() {
        if (this.r < this.#r1) {
            this.r += this.#vr;
            if (this.#instantFade) this.a = Math.max(0, this.a - this.#va);
        } else if (this.a > 0) this.a = Math.max(0, this.a - this.#va);
        else return false;

        return true;
    }
}

module.exports = Circle;
