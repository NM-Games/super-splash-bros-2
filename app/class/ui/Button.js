/**
 * @callback EmptyCallback
 */

const { width, height } = require("../../preload/canvas");

class Button {
    static width = 300;
    static height = 100;
    static hoveringOn = false;
    /** @type {Button[]} */
    static items = [];

    /**
     * Get the button based on its ID, given in the constructor.
     * @param {string} id
     * @returns {Button}
     */
    static getButtonById(id) {
        let output = null;
        for (const button of Button.items) {
            if (button.id === id) {
                output = button;
                break;
            }
        }
        return output;
    }

    id;
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
    disabled;

    /**
     * @constructor
     * Create a new button for menu screens.
     * @param {{
     *  id: string,
     *  text: string,
     *  state: number,
     *  x: {screenFactor: number, offset: number},
     *  y: {screenFactor: number, offset: number},
     *  width?: number,
     *  height?: number,
     *  onclick?: EmptyCallback
     * }} options
     */
    constructor(options) {
        this.id = options.id ?? "";
        this.text = options.text;
        this.state = options.state;
        this.#x = options.x;
        this.#y = options.y;
        this.width = options.width ?? Button.width;
        this.height = options.height ?? Button.height;
        this.scale = Math.min(1, this.width * 1.3 / Button.width);
        this.onclick = options.onclick ?? function() {};
        this.hovering = false;
        this.active = false;
        this.disabled = false;
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
