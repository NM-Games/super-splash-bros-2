/**
 * @callback PlayAudioCallback
 * @param {HTMLAudioElement} file
 *
 * @callback UpdateCallback
 * @param {import("../configfile").Settings["audio"]} config
 */

const { join } = require("path");
const { readdirSync } = require("fs");

const muted = {music: false, sfx: false};

/**
 * @type {{
 *  attack: HTMLAudioElement,
 *  click: HTMLAudioElement,
 *  click_back: HTMLAudioElement,
 *  countdown: HTMLAudioElement,
 *  countdown_go: HTMLAudioElement,
 *  exclusive: HTMLAudioElement,
 *  explosion: HTMLAudioElement,
 *  fish: HTMLAudioElement,
 *  flood: HTMLAudioElement,
 *  gamemenu: HTMLAudioElement,
 *  geyser: HTMLAudioElement,
 *  poopbomb: HTMLAudioElement,
 *  powerup: HTMLAudioElement,
 *  rocket: HTMLAudioElement,
 *  splash_lava: HTMLAudioElement,
 *  splash: HTMLAudioElement,
 *  squash: HTMLAudioElement,
 *  music: HTMLAudioElement,
 *  _running: HTMLAudioElement[],
 *  _play: PlayAudioCallback,
 *  _update: UpdateCallback
 * }}
 */
const audio = {
    _running: [],
    _play: (file) => {
        /** @type {HTMLAudioElement} */
        const item = file.cloneNode(true);
        const index = audio._running.push(item) - 1;

        audio._running[index].muted = muted.sfx;
        audio._running[index].playbackRate = Math.random() * 0.5 + 0.75;
        audio._running[index].play();
        if (audio._running.length > 200) {
            for (let i=0; i<audio._running.length;) {
                if (audio._running[i].ended) audio._running.splice(i, 1);
                else i++;
            }
        }
    },
    _update: (config) => {
        muted.music = !config.music;
        muted.sfx = !config.sfx;

        audio.music.muted = muted.music;
        for (const item of audio._running) item.muted = muted.sfx;
    }
};

readdirSync(join(__dirname, "..", "audio")).forEach((file) => {
    const name = file.replace(/\.[^/.]+$/, "");

    if (!name.startsWith("_")) audio[name] = new Audio(join(__dirname, "..", "audio", file));
});

module.exports = audio;
