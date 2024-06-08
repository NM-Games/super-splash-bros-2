/**
 * @typedef {{
 *  appearance: {playerName: string, preferredColor: number, superpower: number},
 *  graphics: {theme: import("./theme").Themes, fullScreen: boolean, waterFlow: boolean, menuSprites: boolean},
 *  controls: {moveLeft: string, moveRight: string, jump: string, attack: string, launchRocket: string, activateSuperpower: string, gameMenu: string},
 *  audio: {music: boolean, sfx: boolean}
 * }} Settings
 */

const { readFileSync, writeFileSync, existsSync } = require("fs");
const { homedir, EOL, platform } = require("os");
const { join } = require("path");

const filePath = (platform() === "win32")
    ? join(homedir(), "AppData", "Roaming", "ssb2settings.json")
    : join(homedir(), ".ssb2settings.json");

const generatePlayerName = () => {
    return "Splasher" + ("000" + Math.ceil(Math.random() * 9999)).slice(-4);
};

const template = {
    appearance: {
        playerName: generatePlayerName(),
        preferredColor: 0,
        superpower: 0
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
        activateSuperpower: "q",
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
    writeFileSync(filePath, json + EOL);
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

module.exports = {init, get, set, filePath, template, generatePlayerName};
