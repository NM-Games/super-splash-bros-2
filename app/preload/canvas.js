const image = require("./image");
const theme = require("./theme");
const { initial } = require("../class/ui/Button");

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
    setOpacity: (opacity = 1) => {
        c.globalAlpha = opacity;
    },
    filter: {
        /**
         * Add filters and apply them.
         * @param {...string} newFilters
         */
        add: (...newFilters) => {
            filters.push(...newFilters);
            c.filter = (filters.length === 0) ? "none" : filters.join(" ");
        },
        /**
         * Remove filters and apply them.
         * @param {...string} oldFilters
         */
        remove: (...oldFilters) => {
            for (let i=0; i<oldFilters.length; i++) {
                for (let j=0; j<filters.length;) {
                    if (filters[j].includes(oldFilters[i])) filters.splice(j, 1);
                    else j++;
                }
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
         * Fill an up or down pointing triangle on the screen.
         * @param {string | CanvasGradient | CanvasPattern} color
         * @param {number} bx
         * @param {number} y
         * @param {number} w
         * @param {number} h
         */
        triangleUD: (color, bx, y, w, h) => {
            c.fillStyle = color;
            c.beginPath();
            c.moveTo(bx - w / 2, y);
            c.lineTo(bx + w / 2, y);
            c.lineTo(bx, y + h);
            c.closePath();
            c.fill();
        },
        /**
         * Fill a left or right pointing triangle on the screen.
         * @param {string | CanvasGradient | CanvasPattern} color
         * @param {number} x
         * @param {number} ty
         * @param {number} w
         * @param {number} h
         */
        triangleLR: (color, x, by, w, h) => {
            c.fillStyle = color;
            c.beginPath();
            c.moveTo(x, by - h / 2);
            c.lineTo(x, by + h / 2);
            c.lineTo(x + w, by);
            c.closePath();
            c.fill();
        },
        /**
         * Fill a parallellogram on the screen.
         * @param {string | CanvasGradient | CanvasPattern} color
         * @param {number} x
         * @param {number} y
         * @param {number} w
         * @param {number} h
         * @param {number} d
         */
        parallellogram: (color, x, y, w, h, d = 15) => {
            c.fillStyle = color;
            c.beginPath();
            c.moveTo(x + d, y);
            c.lineTo(x + w, y);
            c.lineTo(x + w - d, y + h);
            c.lineTo(x, y + h);
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
        },
        /**
         * Stroke an (incomplete) arc on the screen.
         * @param {string | CanvasGradient | CanvasPattern} color
         * @param {number} x
         * @param {number} y
         * @param {number} r
         * @param {number} lw
         * @param {number} part
         */
        arc: (color, x, y, r, lw = 2, part = 1) => {
            const angle1 = -0.5 * Math.PI;
            const angle2 = part * 2 * Math.PI + angle1;

            c.strokeStyle = color;
            c.lineWidth = lw;
            c.lineCap = "round";
            c.beginPath();
            c.arc(x, y, r, angle1, angle2);
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
     * @returns {undefined | number}
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
        let color = theme.colors.text.light;

        if (button.disabled) {
            options.filter.add("grayscale(1)");
        } else if (button.active) {
            options.filter.add("brightness(100)");
            color = (button.danger) ? theme.colors.error.foreground : theme.colors.ui.primary;
        } else if (button.danger) {
            options.filter.add("hue-rotate(180deg)", "saturate(7)");
        }

        draw.croppedImage(
            image.buttons,
            (button.icon) ? initial.width : 0,
            Number(button.hovering) * (button.icon ? initial.iconButton : initial.height),
            (button.icon) ? initial.iconButton : initial.width,
            (button.icon) ? initial.iconButton : initial.height,
            button.x() + offsetX - button.width / 2,
            button.y() - button.height / 2,
            button.width,
            button.height
        );
        options.filter.remove("grayscale", "brightness", "hue-rotate", "saturate");
        if (button.icon) {
            const iconSize = button.width / 1.5;
            if (!button.active) options.filter.add("brightness(100)");
            draw.croppedImage(
                image.buttons,
                initial.width + initial.iconButton + button.icon()[0] * 120,
                button.icon()[1] * 120,
                120,
                120,
                button.x() - (button.width - iconSize) + offsetX,
                button.y() - (button.height - iconSize),
                iconSize,
                iconSize
            );
            options.filter.remove("brightness");
        } else draw.text({text: button.text, x: button.x() + offsetX, y: button.y(), color, font: {size: 32 * button.scale}, baseline: "middle"});
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
