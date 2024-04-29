/**
 * @callback EmptyCallback
 * 
 * @callback KeybindCallback
 * @param {string} key
 * 
 * @callback TabCallback
 * @param {boolean} shift
 */

const { width, height } = require("../canvas");

class Input {
    static size = 32;
    static hoveringOn = false;
    static keybindsInvalid = false;
    /** @type {Input[]} */
    static items = [];

    id;
    state;
    #x;
    #y;
    width;
    size;
    keybind;
    maxLength;
    numbersOnly;
    value;
    hovering;
    focused;
    disabled;
    onblur;
    ontab;
    onemptybackspace;
    onkeybindselected;
    onmaxlengthreached;
    
    /**
     * Get an input based on its ID, given in the constructor.
     * @param {string} id
     * @returns {Input | null}
     */
    static getInputById(id) {
        let output = null;
        for (const input of Input.items) {
            if (input.id === id) {
                output = input;
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
     * Sanitizer for keybinds in the Settings menu.
     * @param {string} keybind
     * @returns {string}
     */
    static displayKeybind(keybind) {
        if (keybind.startsWith("Arrow")) return keybind.slice(5);
        else if (keybind === " ") return "Space";
        else if (keybind === "Escape") return "Esc";
        else if (keybind === "Control") return "Ctrl";
        else if (keybind === "AltGraph") return "AltGr";
        else if (keybind.length === 1) return keybind.toUpperCase();
        else return keybind;
    };

    /**
     * @constructor
     * Create an input field, for keybinds and IP addresses.
     * @param {{
     *  id: string,
     *  state: number,
     *  x: {screenFactor: number, offset: number},
     *  y: {screenFactor: number, offset: number},
     *  width: number,
     *  size?: number,
     *  keybind?: boolean,
     *  maxLength?: number,
     *  numbersOnly?: boolean
     *  onblur?: EmptyCallback,
     *  ontab?: TabCallback,
     *  onemptybackspace?: EmptyCallback,
     *  onkeybindselected?: KeybindCallback,
     *  onmaxlengthreached?: EmptyCallback
     * }} options
     */
    constructor(options) {
        this.id = options.id;
        this.state = options.state;
        this.#x = options.x;
        this.#y = options.y;
        this.width = options.width;
        this.size = options.size ?? Input.size;
        this.keybind = options.keybind ?? false;
        this.maxLength = options.maxLength ?? 16;
        this.numbersOnly = options.numbersOnly ?? false;
        this.onblur = options.onblur ?? function() {};
        this.ontab = options.ontab ?? function() {};
        this.onemptybackspace = options.onemptybackspace ?? function() {};
        this.onkeybindselected = options.onkeybindselected ?? function() {};
        this.onmaxlengthreached = options.onmaxlengthreached ?? function() {};
        this.hovering = false;
        this.focused = false;
        this.disabled = false;
        this.value = "";

        addEventListener("keydown", (e) => {
            if (!this.focused || (e.key.length === 1 && (isNaN(e.key) || e.key === " ") && this.numbersOnly)) return;

            if (e.key === "Tab") this.ontab(e.shiftKey);
            else if (e.key === "Backspace" && this.value.length === 0) this.onemptybackspace();

            if (this.keybind) {
                this.value = Input.displayKeybind(e.key);
                
                const inputs = Input.items.map((item) => item.keybind ? item.value : null);
                while (inputs.indexOf(null) > -1) inputs.splice(inputs.indexOf(null), 1);
                const uniques = inputs.filter((item, index, array) => array.indexOf(item) === index);
                
                if (uniques.length !== inputs.length) Input.keybindsInvalid = true; else {
                    Input.keybindsInvalid = (uniques.length !== inputs.length);
                    this.onkeybindselected(e.key);
                    this.focused = false;
                    this.onblur();
                }
            } else {
                if (e.key.length === 1) this.value += e.key;
                else if (e.key === "Backspace") this.value = this.value.slice(0, -1);
                else if (e.key === "Escape" || e.key == "Enter") {
                    this.focused = false;
                    this.onblur();
                }
            }

            if (this.value.length >= this.maxLength) this.onmaxlengthreached();
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
