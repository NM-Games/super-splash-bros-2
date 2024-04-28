const { width, height } = require("../canvas");

class Input {
    static size = 32;
    /** @type {Input[]} */
    static items = [];

    name;
    state;
    #x;
    #y;
    width;
    size;
    numbersOnly;
    value;
    hovering;
    focused;
    
    /**
     * Get the value of an input based on its name, given in the constructor.
     * @param {string} name
     * @returns {string | null}
     */
    static getValueByName(name) {
        let output = null;
        for (const input of Input.items) {
            if (input.name === name) {
                output = input.value;
                break;
            }
        }
        return output;
    }
    /**
     * Get the focused input field.
     * @returns {Input | null}
     */
    static getFocused() {
        let output = null;
        for (const input of Input.items) {
            if (input.focused) {
                output = input;
                break;
            }
        }
        return output;
    }

    /**
     * @constructor
     * Create an input field, for keybinds and IP addresses.
     * @param {{
     *  name: string,
     *  state: number,
     *  x: {screenFactor: number, offset: number},
     *  y: {screenFactor: number, offset: number},
     *  width: number,
     *  size: number,
     *  maxLength: number,
     *  numbersOnly: boolean
     * }} options
     */
    constructor(options) {
        this.name = options.name;
        this.state = options.state;
        this.#x = options.x;
        this.#y = options.y;
        this.width = options.width;
        this.size = options.size ?? Input.size;
        this.maxLength = options.maxLength ?? 16;
        this.numbersOnly = options.numbersOnly ?? false;
        this.hovering = false;
        this.focused = false;
        this.value = "";

        addEventListener("keydown", (e) => {
            if (!this.focused || (e.key.length === 1 && isNaN(e.key) && this.numbersOnly)) return;

            if (e.key.length === 1) this.value += e.key;
            else if (e.key === "Backspace") this.value = this.value.slice(0, -1);
            else if (e.key === "Escape" || e.key == "Enter") this.focused = false;

            this.value = this.value.slice(0, this.maxLength);
        });
    }

    /**
     * Get the center X position of the input.
     * @returns {number}
     */
    getX() {
        return width(this.#x.screenFactor) + this.#x.offset;
    }
    /**
     * Get the center Y position of the input.
     * @returns {number}
     */
    getY() {
        return height(this.#y.screenFactor) + this.#y.offset;
    }
    /**
     * Get the height of the input, based on its size.
     * @param {number} factor
     * @returns {number}
     */
    getH(factor = 1) {
        return (this.size + 16) * factor;
    }
}

module.exports = Input;
