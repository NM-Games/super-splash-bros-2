/**
 * @typedef {{
 *  appearance: {playerName: string, preferredColor: number, powerup: number},
 *  graphics: {theme: import("./preload/theme").Themes, fullScreen: boolean, waterFlow: boolean, menuSprites: boolean},
 *  controls: {moveLeft: string, moveRight: string, jump: string, attack: string, launchRocket: string, activatePowerup: string, gameMenu: string},
 *  audio: {music: boolean, sfx: boolean},
 *  misc: {recordReplays: boolean}
 * }} Settings
 */

const { app } = require("electron");
const { readdirSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, statSync } = require("fs");
const { EOL } = require("os");
const { join } = require("path");

const { generateName } = require("./class/game/Player");

/** @type {{mainFolder: string, settingsFile: string, replayFolder: string}} */
const paths = {};

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
    },
    misc: {
        recordReplays: false
    }
};

/**
 * Retrieve the settings file.
 * @param {string} file
 */
const read = (file) => {
    const contents = readFileSync(file);
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
 * @param {string} file
 * @param {object} data
 * @param {number} spaces
 */
const write = (file, data, spaces = 4) => {
    const json = JSON.stringify(data, null, spaces);
    writeFileSync(file, json.replaceAll("\n", EOL) + EOL);
};

// Settings file
const settings = {
    /** @returns {Settings} */
    get: () => read(paths.settingsFile),
    /** @param {Settings} settings */
    set: (settings) => write(paths.settingsFile, settings)
};

// Replay files
const replays = {
    list: () => {
        const payload = [];
        const items = readdirSync(paths.replayFolder);
        for (const i of items) {
            const stats = statSync(join(paths.replayFolder, i));
            payload.push({
                name: i,
                size: stats.size,
                time: stats.birthtimeMs
            });
        }
        return payload.sort((a, b) => a.time < b.time).slice(0, 5);
    },
    /** @returns {import("./class/game/Replay").ReplayContent} */
    read: (name) => read(join(paths.replayFolder, name)),
    write: (name, data) => write(join(paths.replayFolder, name), data, 0),
    delete: (name) => rmSync(join(paths.replayFolder, name), {force: true})
};

/**
 * Initiate and check files and folders, recommended on game start.
 */
const init = () => {
    paths.mainFolder = join(app.getPath("appData"), app.name);
    paths.settingsFile = join(paths.mainFolder, "settings.json");
    paths.replayFolder = join(paths.mainFolder, "replays");

    if (!existsSync(paths.mainFolder)) mkdirSync(paths.mainFolder);
    if (!existsSync(paths.replayFolder)) mkdirSync(paths.replayFolder);

    if (!existsSync(paths.settingsFile)) settings.set(template); else {
        const config = settings.get();
        const fileKeys = Object.keys(config).sort();
        const originalKeys = Object.keys(template).sort();

        if (JSON.stringify(fileKeys) !== JSON.stringify(originalKeys)) {
            const newConfig = {};
            for (const i of Object.keys(template)) newConfig[i] = config[i] ?? template[i];
            settings.set(newConfig);
        }
    }
};

module.exports = {init, settings, replays};
