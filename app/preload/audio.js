/**
 * @callback PlayAudioCallback
 * @param {HTMLAudioElement} audio
 */

const { join } = require("path");
const { readdirSync } = require("fs");

/**
 * @type {{
 *  music: HTMLAudioElement,
 *  _play: PlayAudioCallback
 * }}
 */
const audio = {
    _play: (audio) => {
        audio.currentTime = 0;
        audio.play();
    }
};

readdirSync(join(__dirname, "..", "audio")).forEach((file) => {
    const name = file.replace(/\.[^/.]+$/, "");
   
    if (!name.startsWith("_")) audio[name] = new Audio(join(__dirname, "..", "audio", file));
});

module.exports = audio;
