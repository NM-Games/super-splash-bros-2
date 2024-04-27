const image = require("./image");

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

    update();
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

// const roundedRectangle = (x, y, w, h, r) => {
//     c.beginPath();
//     c.moveTo(x, y + r);
//     c.quadraticCurveTo(x, y, x + r, y);
//     c.lineTo(x + w - r, y);
//     c.quadraticCurveTo(x + w, y, x + w, y + r);
//     c.lineTo(x + w, y + h - r);
//     c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
//     c.lineTo(x + r, y + h);
//     c.quadraticCurveTo(x, y + h, x, y + h - r);
//     c.closePath();
// };

const draw = {
    /**
     * Fill a rectangle on the screen
     * @param {string | CanvasGradient | CanvasPattern} color
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     */
    fill: {
        rect: (color, x, y, w, h) => {
            c.fillStyle = color;
            c.fillRect(x, y, w, h);
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
     * Draw a button on the screen
     * @param {string} text 
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @param {boolean} hovering 
     */
    button: (text, x, y, w, h, hovering = false) => {
        draw.croppedImage(
            image.buttons,
            0,
            Number(hovering) * (image.buttons.height / 2),
            image.buttons.width,
            image.buttons.height / 2,
            x - w / 2,
            y - h / 2,
            w,
            h
        );
        draw.text(text, x, y, "white", 32, "Shantell Sans", "", "center", "middle");
    }
}

module.exports = {
    init,
    width,
    height,
    clear,
    draw
};
