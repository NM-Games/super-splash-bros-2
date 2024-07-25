/**
 * @callback EmptyCallback
 *
 * @callback IconCallback
 * @returns {number[]}
 *
 * @callback CoordinateCallback
 * @returns {number}
 */

class Button {
    static initial = {width: 711, height: 207, iconButton: 207};
    static width = 300;
    static height = 100;
    static iconSize = 75;

    /** @type {Button[]} */
    static items = [];
    /** @type {Button[]} */
    static dialogItems = [];
    /** @type {Button[]} */
    static gameMenuItems = [];

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
    icon;
    state;
    x;
    y;
    width;
    height;
    scale;
    onclick;
    hovering;
    active;
    danger;
    disabled;

    /**
     * @constructor
     * Create a new button for menu screens.
     * @param {{
     *  id: string,
     *  text?: string,
     *  icon?: IconCallback,
     *  state: number,
     *  x: CoordinateCallback,
     *  y: CoordinateCallback,
     *  width?: number,
     *  height?: number,
     *  danger?: boolean,
     *  disabled?: boolean,
     *  onclick?: EmptyCallback
     * }} options
     */
    constructor(options) {
        this.id = options.id ?? "";
        this.text = options.text ?? "";
        this.icon = options.icon ?? null;
        this.state = options.state;
        this.x = options.x;
        this.y = options.y;
        this.width = options.width ?? (options.icon ? Button.iconSize : Button.width);
        this.height = options.height ?? (options.icon ? Button.iconSize : Button.height);
        this.scale = Math.min(1, this.width * 1.3 / Button.width);
        this.onclick = options.onclick ?? function() {};
        this.hovering = false;
        this.active = false;
        this.danger = options.danger ?? false;
        this.disabled = options.disabled ?? false;
    }
}

module.exports = Button;
