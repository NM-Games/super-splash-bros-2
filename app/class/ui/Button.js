/**
 * @callback EmptyCallback
 * 
 * @callback CoordinateCallback
 * @returns {number}
 */

class Button {
    static width = 300;
    static height = 100;
    static hoveringOn = false;
    /** @type {Button[]} */
    static items = [];
    /** @type {Button[]} */
    static dialogItems = [];

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
    x;
    y;
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
     *  x: CoordinateCallback,
     *  y: CoordinateCallback,
     *  width?: number,
     *  height?: number,
     *  disabled?: boolean,
     *  onclick?: EmptyCallback
     * }} options
     */
    constructor(options) {
        this.id = options.id ?? "";
        this.text = options.text;
        this.state = options.state;
        this.x = options.x;
        this.y = options.y;
        this.width = options.width ?? Button.width;
        this.height = options.height ?? Button.height;
        this.scale = Math.min(1, this.width * 1.3 / Button.width);
        this.onclick = options.onclick ?? function() {};
        this.hovering = false;
        this.active = false;
        this.disabled = options.disabled ?? false;
    }
}

module.exports = Button;
