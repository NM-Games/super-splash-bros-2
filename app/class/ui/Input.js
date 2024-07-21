/**
 * @callback EmptyCallback
 * 
 * @callback CoordinateCallback
 * @returns {number}
 * 
 * @callback KeybindCallback
 * @param {string} key
 * 
 * @callback TabCallback
 * @param {boolean} shift
 * 
 * @callback TypeCallback
 * @param {boolean} blurred
 */

class Input {
    static size = 32;
    static keybindsInvalid = false;
    static isRemapping = false;
    /** @type {Input[]} */
    static items = [];

    id;
    state;
    x;
    y;
    width;
    size;
    /** @type {string | boolean} */
    keybind;
    maxLength;
    numbersOnly;
    value;
    hovering;
    focused;
    disabled;
    onblur;
    ontype;
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
     * Sanitizer for keybinds in the Settings menu.
     * @param {string} keybind
     * @returns {string}
     */
    static displayKeybind(keybind) {
        if (keybind.startsWith("Arrow")) return keybind.slice(5);
        else if (keybind === " ") return "Space";
        else if (keybind === "Escape") return "Esc";
        else if (keybind === "Backspace") return "Back";
        else if (keybind === "CapsLock") return "Caps";
        else if (keybind === "Control") return "Ctrl";
        else if (keybind === "AltGraph") return "AltGr";
        else if (keybind === "Compose") return "Comp.";
        else if (keybind.length === 1) return keybind.toUpperCase();
        else return keybind;
    };

    /**
     * @constructor
     * Create an input field, for keybinds and IP addresses.
     * @param {{
     *  id: string,
     *  state: number,
     *  x: CoordinateCallback,
     *  y: CoordinateCallback,
     *  width: number,
     *  size?: number,
     *  keybind?: boolean,
     *  disabled?: boolean,
     *  maxLength?: number,
     *  numbersOnly?: boolean
     *  onblur?: EmptyCallback,
     *  ontab?: TabCallback,
     *  ontype?: TypeCallback,
     *  onemptybackspace?: EmptyCallback,
     *  onkeybindselected?: KeybindCallback,
     *  onmaxlengthreached?: EmptyCallback
     * }} options
     */
    constructor(options) {
        this.id = options.id;
        this.state = options.state;
        this.x = options.x;
        this.y = options.y;
        this.width = options.width;
        this.size = options.size ?? Input.size;
        this.keybind = options.keybind ?? false;
        this.maxLength = options.maxLength ?? 16;
        this.numbersOnly = options.numbersOnly ?? false;
        this.onblur = options.onblur ?? function() {};
        this.ontab = options.ontab ?? function() {};
        this.ontype = options.ontype ?? function() {};
        this.onemptybackspace = options.onemptybackspace ?? function() {};
        this.onkeybindselected = options.onkeybindselected ?? function() {};
        this.onmaxlengthreached = options.onmaxlengthreached ?? function() {};
        this.hovering = false;
        this.focused = false;
        this.disabled = options.disabled ?? false;
        this.value = "";

        addEventListener("keydown", (e) => {
            if (!this.focused || (e.key.length === 1 && e.key !== "." && (isNaN(e.key) || e.key === " ") && this.numbersOnly)) return;

            if (e.key === "Tab" || (e.key === "." && !e.shiftKey && this.id.startsWith("IP"))) this.ontab(e.shiftKey);
            else if (e.key === "Backspace" && this.value.length === 0) this.onemptybackspace();

            if (this.numbersOnly && e.key === ".") return;

            if (this.keybind) {
                this.keybind = e.key;
                this.value = Input.displayKeybind(e.key);
                
                const inputs = Input.items.map((item) => item.keybind ? item.value : null);
                while (inputs.indexOf(null) > -1) inputs.splice(inputs.indexOf(null), 1);
                const uniques = inputs.filter((item, index, array) => array.indexOf(item) === index);
                
                if (uniques.length !== inputs.length) Input.keybindsInvalid = true; else {
                    Input.keybindsInvalid = (uniques.length !== inputs.length);
                    this.onkeybindselected(this.keybind);
                    this.focused = false;
                    this.onblur();
                    setTimeout(() => Input.isRemapping = false, 25);
                }
            } else {
                if (e.key.length === 1) {
                    this.value += e.key;
                    this.ontype(false);
                } else if (e.key === "Backspace") {
                    this.value = this.value.slice(0, -1);
                    this.ontype(false);
                } else if (e.key === "Escape" || e.key == "Enter") {
                    this.focused = false;
                    this.ontype(true);
                    this.onblur();
                }
            }

            if (this.value.length >= this.maxLength) this.onmaxlengthreached();
            this.value = this.value.slice(0, this.maxLength);
        });
    }

    /**
     * Get the height of the input, based on its size.
     * @param {number} factor
     * @returns {number}
     */
    getHeight(factor = 1) {
        return (this.size + 16) * factor;
    }

    /** Focus the input, if not disabled. */
    focus() {
        if (!this.disabled) this.focused = true;
    }

    /**
     * Switch to another input field.
     * @param {string} id
     */
    switchToID(id) {
        this.focused = false;
        this.onblur();
        setTimeout(() => Input.getInputById(id).focus(), 10);
    }
}

module.exports = Input;
