const image = require("./image");
const theme = require("./theme");

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
     * Draw text on the screen.
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @param {string} color
     * @param {number} fontSize
     * @param {string} fontFamily
     * @param {"" | "bold" | "italic"} fontStyle 
     * @param {"left" | "center" | "right"} alignment 
     * @param {"top" | "middle" | "bottom" | "alphabetic"} baseline 
     */
    text: (text, x, y, color, fontSize, fontFamily = "Shantell Sans", fontStyle = "", alignment = "left", baseline = "alphabetic") => {
        c.fillStyle = color;
        c.textBaseline = baseline;
        c.textAlign = alignment;
        c.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
        c.fillText(text, x, y);
    },
    /**
     * Draw a button on the screen.
     * @param {import("./elements/Button")} button
     * @param {number} offsetX
     */
    button: (button, offsetX) => {
        c.filter = (button.disabled) ? "grayscale(1)" : (button.active) ? "brightness(100)" : "none";
        draw.croppedImage(
            image.buttons,
            0,
            Number(button.hovering) * (image.buttons.height / 2),
            image.buttons.width,
            image.buttons.height / 2,
            button.getX() + offsetX - button.width / 2,
            button.getY() - button.height / 2,
            button.width,
            button.height
        );
        c.filter = "none";
        draw.text(button.text, button.getX() + offsetX, button.getY(), (button.active) ? theme.colors.ui.primary : "white", 32 * button.scale, "Shantell Sans", "", "center", "middle");
    },
    /**
     * Draw an input field on the screen.
     * @param {import("./elements/Input")} input
     * @param {number} offsetX
     * @param {boolean} invalid
     * @param {boolean} trailingChar
     */
    input: (input, offsetX, invalid, trailingChar) => {
        const x = input.getX() + offsetX;
        const y = input.getY();
        const w = input.width;
        const h = input.getH();
        c.filter = (input.disabled) ? "grayscale(1)" : "none";
        draw.fill.rect(theme.colors.ui.primary, x - w / 2, y - h / 2, w, h, 6);
        draw.stroke.rect((input.focused) ? "white" : theme.colors.ui.secondary, x - w / 2, y - h / 2, w, h, 3, 6);
        draw.text(
            input.value + (input.focused && trailingChar ? "_":""),
            x - (input.keybind ? 0 : w / 2 - 8),
            y + 4,
            (invalid && input.keybind) ? "#e00" : "white",
            input.size,
            "Shantell Sans",
            "",
            (input.keybind) ? "center":"left", 
            "middle"
        );
        c.filter = "none";
    }
}

module.exports = {
    init,
    width,
    height,
    clear,
    draw
};
