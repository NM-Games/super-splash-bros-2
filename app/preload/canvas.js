const image = require("./image");
const theme = require("./theme");

/** @type {string[]} */
const filters = [];

/** @type {HTMLCanvasElement} */
let canvas;
/** @type {CanvasRenderingContext2D} */
let c;


const update = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}

/** Initiate the canvas. Only call this when the DOM is loaded! */
const init = () => {
    canvas = document.querySelector("canvas");
    c = canvas.getContext("2d");

    addEventListener("load", update);
    addEventListener("resize", update);
};

/**
 * Get the canvas width.
 * @param {number} factor
 * @returns {number}
 */
const width = (factor = 1) => {
    return canvas.width * factor;
};

/**
 * Get the canvas height.
 * @param {number} factor 
 * @returns {number}
 */
const height = (factor = 1) => {
    return canvas.height * factor;
};

/** Clears the entire canvas. */
const clear = () => {
    c.clearRect(0, 0, width(), height());
};

const options = {
    /**
     * Set the opacity of drawn objects.
     * @param {number} opacity
     */
    setOpacity: (opacity) => {
        c.globalAlpha = opacity;
    },
    filter: {
        /**
         * Add a filter and apply it.
         * @param {string} filter
         */
        add: (filter) => {
            filters.push(filter);
            c.filter = (filters.length === 0) ? "none" : filters.join(" ");
        },
        /**
         * Remove a filter and apply it.
         * @param {string} filter
         */
        remove: (filter) => {
            for (let i=0; i<filters.length;) {
                if (filters[i].includes(filter)) filters.splice(i, 1);
                else i++;
            }
            c.filter = (filters.length === 0) ? "none" : filters.join(" ");
        }
    },
    /**
     * Apply shadows to drawn objects.
     * @param {string} color
     * @param {number} blur
     * @param {number} x
     * @param {number} y
     */
    setShadow: (color = "transparent", blur = 0, x = 0, y = 0) => {
        c.shadowColor = color;
        c.shadowBlur = blur;
        c.shadowOffsetX = x;
        c.shadowOffsetY = y;
    },
    /**
     * Generate a gradient, which can be applied as a color.
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @param  {...{pos: number, color: string}} colors
     * @returns {CanvasGradient}
     */
    gradient: (x1, y1, x2, y2, ...colors) => {
        const grd = c.createLinearGradient(x1, y1, x2, y2);
        for (const color of colors) grd.addColorStop(color.pos, color.color);
        return grd;
    },
    /**
     * Generate a pattern of an image, which can be applied as a color.
     * @param {CanvasImageSource} image
     * @param {"repeat" | "repeat-x" | "repeat-y" | "no-repeat"} repetition
     * @returns {CanvasPattern}
     */
    pattern: (image, repetition = "repeat") => {
        return c.createPattern(image, repetition);
    }
};

const draw = {
    fill: {
        /**
         * Fill a rectangle on the screen.
         * @param {string | CanvasGradient | CanvasPattern} color
         * @param {number} x
         * @param {number} y
         * @param {number} w
         * @param {number} h
         * @param {number} r
         */
        rect: (color, x, y, w, h, r = 0) => {
            c.fillStyle = color;
            c.beginPath();
            c.moveTo(x, y + r);
            c.quadraticCurveTo(x, y, x + r, y);
            c.lineTo(x + w - r, y);
            c.quadraticCurveTo(x + w, y, x + w, y + r);
            c.lineTo(x + w, y + h - r);
            c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            c.lineTo(x + r, y + h);
            c.quadraticCurveTo(x, y + h, x, y + h - r);
            c.closePath();
            c.fill();
        },
        /**
         * Fill a circle on the screen.
         * @param {string | CanvasGradient | CanvasPattern} color
         * @param {number} x 
         * @param {number} y 
         * @param {number} r 
         */
        circle: (color, x, y, r) => {
            c.fillStyle = color;
            c.beginPath();
            c.arc(x, y, r, 0, Math.PI * 2);
            c.fill();
        },
        /**
         * Fill a down-pointing triangle on the screen.
         * @param {string | CanvasGradient | CanvasPattern} color
         * @param {number} tx
         * @param {number} y
         * @param {number} w
         * @param {number} h
         */
        triangle: (color, tx, y, w, h) => {
            c.fillStyle = color;
            c.beginPath();
            c.moveTo(tx - w / 2, y);
            c.lineTo(tx + w / 2, y);
            c.lineTo(tx, y + h);
            c.closePath();
            c.fill();
        }
    },
    stroke: {
        /**
         * Stroke a rectangle on the screen.
         * @param {string | CanvasGradient | CanvasPattern} color
         * @param {number} x
         * @param {number} y
         * @param {number} w
         * @param {number} h
         * @param {number} lw
         * @param {number} r
         */
        rect: (color, x, y, w, h, lw = 2, r = 0) => {
            c.strokeStyle = color;
            c.lineWidth = lw;
            c.beginPath();
            c.moveTo(x, y + r);
            c.quadraticCurveTo(x, y, x + r, y);
            c.lineTo(x + w - r, y);
            c.quadraticCurveTo(x + w, y, x + w, y + r);
            c.lineTo(x + w, y + h - r);
            c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            c.lineTo(x + r, y + h);
            c.quadraticCurveTo(x, y + h, x, y + h - r);
            c.closePath();
            c.stroke();
        }
    },
    /**
     * Draw an image on the canvas.
     * @param {HTMLImageElement} image
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     */
    image: (image, x, y, w = image.width, h = image.height) => {
        c.drawImage(image, x, y, w, h);
    },
    /**
     * Draw a cropped image on the canvas.
     * @param {HTMLImageElement} image
     * @param {number} sx
     * @param {number} sy
     * @param {number} sw
     * @param {number} sh
     * @param {number} dx
     * @param {number} dy
     * @param {number} dw
     * @param {number} dh
     */
    croppedImage: (image, sx, sy, sw, sh, dx, dy, dw, dh) => {
        c.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    },
    /**
     * Draw a line on the screen.
     * @param {string | CanvasGradient | CanvasPattern} color
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} lw
     * @param {"butt" | "round"} lc
     */
    line: (color, x1, y1, x2, y2, lw = 2, lc = "round") => {
        c.strokeStyle = color;
        c.lineWidth = lw;
        c.lineCap = lc;
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(x2, y2);
        c.stroke();
    },
    /**
     * Draw text on the screen.
     * @param {{
     *  text: string,
     *  x: number,
     *  y: number,
     *  color?: string | CanvasGradient | CanvasPattern,
     *  maxWidth?: number,
     *  alignment?: "left" | "center" | "right",
     *  baseline?: "alphabetic" | "bottom" | "middle" | "top",
     *  font: {style?: "bold" | "italic", size: number, family?: string},
     *  measure?: boolean
     * }} options
     * @returns {void | number}
     */
    text: (options) => {
        c.fillStyle = options.color ?? theme.getTextColor();
        c.textBaseline = options.baseline ?? "alphabetic";
        c.textAlign = options.alignment ?? "center";
        c.font = `${options.font.style ?? ""} ${options.font.size}px ${options.font.family ?? "Shantell Sans"}`;
        if (options.measure) return c.measureText(options.text).width;
        else c.fillText(options.text, options.x, options.y, options.maxWidth);
    },
    /**
     * Draw a button on the screen.
     * @param {import("../class/ui/Button")} button
     * @param {number} offsetX
     */
    button: (button, offsetX) => {
        if (button.disabled) options.filter.add("grayscale(1)");
        else if (button.active) options.filter.add("brightness(100)");

        draw.croppedImage(
            image.buttons,
            0,
            Number(button.hovering) * (image.buttons.height / 2),
            image.buttons.width,
            image.buttons.height / 2,
            button.x() + offsetX - button.width / 2,
            button.y() - button.height / 2,
            button.width,
            button.height
        );
        options.filter.remove("grayscale");
        options.filter.remove("brightness");
        draw.text({
            text: button.text,
            x: button.x() + offsetX,
            y: button.y(),
            color: (button.active) ? theme.colors.ui.primary : "white",
            font: {size: 32 * button.scale},
            baseline: "middle"
        });
    },
    /**
     * Draw an input field on the screen.
     * @param {import("../class/ui/Input")} input
     * @param {number} offsetX
     * @param {boolean} invalid
     * @param {boolean} trailingChar
     */
    input: (input, offsetX, invalid, trailingChar) => {
        const x = input.x() + offsetX;
        const y = input.y();
        const w = input.width;
        const h = input.getHeight();
        if (input.disabled) options.filter.add("grayscale(1)");
        draw.fill.rect(theme.colors.ui.primary, x - w / 2, y - h / 2, w, h, 6);
        draw.stroke.rect((input.focused) ? "white" : (input.hovering) ? "#eee" : theme.colors.ui.secondary, x - w / 2, y - h / 2, w, h, 3, 6);
        draw.text({
            text: input.value + (input.focused && trailingChar ? "_":""),
            x: x - (input.keybind ? 0 : w / 2 - 8),
            y: y + 4,
            color: (invalid && input.keybind) ? theme.colors.error.foreground : "white",
            font: {size: input.size},
            alignment: (input.keybind) ? "center":"left", 
            baseline: "middle"
        });
        options.filter.remove("grayscale");
    }
}

module.exports = {
    init,
    width,
    height,
    clear,
    options,
    draw
};
