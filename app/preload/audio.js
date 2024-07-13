/**
 * @callback PlayAudioCallback
 * @param {HTMLAudioElement} audio
 * 
 * @callback UpdateCallback
 * @param {import("../configfile").Settings["audio"]} config
 */

const { join } = require("path");
const { readdirSync } = require("fs");

/**
 * @type {{
 *  music: HTMLAudioElement,
 *  _play: PlayAudioCallback,
 *  _update: UpdateCallback
 * }}
 */
const audio = {
    _play: (audio) => {
        audio.currentTime = 0;
        audio.play();
    },
    _update: (config) => {
        const keys = Object.keys(audio).filter(x => !x.startsWith("_"));
        for (const i of keys) audio[i].muted = (i === "music") ? !config.music : !config.sfx;
    }
};

readdirSync(join(__dirname, "..", "audio")).forEach((file) => {
    const name = file.replace(/\.[^/.]+$/, "");
   
    if (!name.startsWith("_")) audio[name] = new Audio(join(__dirname, "..", "audio", file));
});

module.exports = audio;
