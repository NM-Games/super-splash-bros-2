/**
 * @callback EmptyCallback
 */

const { width, height } = require("../canvas");

class Button {
    static width = 275;
    static height = 100;
    /** @type {Button[]} */
    static items = [];

    text;
    state;
    #x;
    #y;
    width;
    height;
    scale;
    onclick;
    hovering;
    active;

    /**
     * @constructor
     * Create a new button for menu screens.
     * @param {{
     *  text: string,
     *  state: number,
     *  x: {screenFactor: number, offset: number},
     *  y: {screenFactor: number, offset: number},
     *  width: number,
     *  height: number,
     *  onclick: EmptyCallback | null
     * }} options
     */
    constructor(options) {
        this.text = options.text;
        this.state = options.state;
        this.#x = options.x;
        this.#y = options.y;
        this.width = options.width ?? Button.width;
        this.height = options.height ?? Button.height;
        this.scale = Math.min(1, this.width * 1.3 / Button.width);
        this.onclick = options.onclick;
        this.hovering = false;
        this.active = false;
    }

    /**
     * Get the center X position of the button.
     * @returns {number}
     */
    getX() {
        return width(this.#x.screenFactor) + this.#x.offset;
    }
    /**
     * Get the center Y position of the button.
     * @returns {number}
     */
    getY() {
        return height(this.#y.screenFactor) + this.#y.offset;
    }
}

module.exports = Button;
