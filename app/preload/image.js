const { join } = require("path");
const { readdirSync } = require("fs");

/**
 * @type {{
 *  buttons: HTMLImageElement,
 *  eliminated: HTMLImageElement,
 *  explosion: HTMLImageElement,
 *  itembox: HTMLImageElement,
 *  logo: HTMLImageElement,
 *  logo_nmgames: HTMLImageElement,
 *  platforms: HTMLImageElement,
 *  splash: HTMLImageElement,
 *  sprites: HTMLImageElement,
 *  stars: HTMLImageElement,
 *  water: HTMLImageElement
 * }}
 */
const image = {};

readdirSync(join(__dirname, "..", "img", "game")).forEach((file) => {
   const name = file.replace(/\.[^/.]+$/, "");

   image[name] = new Image();
   image[name].src = join(__dirname, "..", "img", "game", file);
});

module.exports = image;
