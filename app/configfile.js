/**
 * @typedef {{
 *  appearance: {playerName: string, preferredColor: number, powerup: number},
 *  graphics: {theme: import("./preload/theme").Themes, fullScreen: boolean, waterFlow: boolean, menuSprites: boolean},
 *  controls: {moveLeft: string, moveRight: string, jump: string, attack: string, launchRocket: string, activatePowerup: string, gameMenu: string},
 *  audio: {music: boolean, sfx: boolean}
 * }} Settings
 */

const { app } = require("electron");
const { readFileSync, writeFileSync, existsSync } = require("fs");
const { EOL } = require("os");
const { join } = require("path");

const { generateName } = require("./class/game/Player");


const filePath = join(app.getPath("appData"), app.name, "settings.json");

/** @type {Settings} */
const template = {
    appearance: {
        playerName: generateName(),
        preferredColor: 0,
        powerup: 0
    },
    graphics: {
        theme: "daylight",
        fullScreen: false,
        waterFlow: true,
        menuSprites: true
    },
    controls: {
        moveLeft: "a",
        moveRight: "d",
        jump: "w",
        attack: " ",
        launchRocket: "e",
        activatePowerup: "q",
        gameMenu: "Escape"
    },
    audio: {
        music: true,
        sfx: true
    }
};

/**
 * Retrieve the settings file.
 * @returns {Settings}
 */
const get = () => {
    const contents = readFileSync(filePath);
    let json;

    try {
        json = JSON.parse(contents);
    } catch {
        json = {};
    }
    return json;
};

/**
 * Change the settings file.
 * @param {Settings} settings
 */
const set = (settings) => {
    const json = JSON.stringify(settings, null, 4);
    writeFileSync(filePath, json.replaceAll("\n", EOL) + EOL);
};

/**
 * Verify the settings file, recommended on game start.
 */
const init = () => {
    if (!existsSync(filePath)) set(template); else {
        const fileKeys = Object.keys(get()).sort();
        const originalKeys = Object.keys(template).sort();

        if (JSON.stringify(fileKeys) !== JSON.stringify(originalKeys)) set(template);
    }
};

module.exports = {init, get, set, filePath, template};
