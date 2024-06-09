/**
 * @callback AspectRatioCallback
 * @param {HTMLImageElement} image
 * @returns {number}
 */

const { join } = require("path");
const { readdirSync } = require("fs");

/**
 * @type {{
 *  buttons: HTMLImageElement,
 *  disconnected: HTMLImageElement,
 *  eliminated: HTMLImageElement,
 *  explosion: HTMLImageElement,
 *  fish: HTMLImageElement,
 *  logo: HTMLImageElement,
 *  logo_nmgames: HTMLImageElement,
 *  platforms: HTMLImageElement,
 *  poopbomb: HTMLImageElement,
 *  splash: HTMLImageElement,
 *  sprites: HTMLImageElement,
 *  stars: HTMLImageElement,
 *  superpowers: HTMLImageElement,
 *  water: HTMLImageElement,
 *  _getAspectRatio: AspectRatioCallback
 * }}
 */
const image = {
    _getAspectRatio: (image) => image.height / image.width
};

readdirSync(join(__dirname, "..", "img", "game")).forEach((file) => {
    const name = file.replace(/\.[^/.]+$/, "");
   
    if (!name.startsWith("_")) {
        image[name] = new Image();
        image[name].src = join(__dirname, "..", "img", "game", file);
    }
});

module.exports = image;
