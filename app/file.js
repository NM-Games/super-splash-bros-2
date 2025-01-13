/**
 * @typedef {{
 *  appearance: {playerName: string, preferredColor: number, powerup: number},
 *  graphics: {theme: import("./preload/theme").Themes, fullScreen: boolean, waterFlow: boolean, menuSprites: boolean},
 *  controls: {moveLeft: string, moveRight: string, jump: string, attack: string, launchRocket: string, activatePowerup: string, gameMenu: string},
 *  audio: {music: boolean, sfx: boolean},
 *  misc: {recordReplays: boolean}
 * }} Settings
 * 
 * @typedef {{
 *  gamesPlayed: number[],
 *  meleeAttacks: number,
 *  rocketsFired: number,
 *  damageTaken: number,
 *  timesSplashed: number,
 *  fishCollected: number,
 *  traveledX: number,
 *  traveledY: number
 * }} Statistics
 *
 * @typedef {{
 *  mainFolder: string,
 *  settingsFile: string,
 *  statisticsFile: string,
 *  replayFolder: string
 * }} Paths
 */

const { app } = require("electron");
const {
    readFile,
    readFileSync,
    readdirSync,
    writeFile,
    existsSync,
    rmSync,
    copyFile,
    mkdirSync,
    statfsSync,
    statSync
} = require("fs");
const { EOL } = require("os");
const { join, parse } = require("path");

const { generateName, getStatisticsTemplate } = require("./class/game/Player");

/** @type {Paths} */
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
 * @param {import("fs").NoParamCallback} onfinished
 */
const write = (file, data, spaces = 4, onfinished = () => {}) => {
    const json = JSON.stringify(data, null, spaces);
    writeFile(file, json.replaceAll("\n", EOL) + EOL, onfinished);
};

// Settings file
const settings = {
    /** @returns {Settings} */
    get: () => read(paths.settingsFile),
    /** @param {Settings} settings */
    set: (settings = template) => write(paths.settingsFile, settings)
};

// Statistics file
const statistics = {
    /** @returns {Statistics} */
    get: () => read(paths.statisticsFile),
    /** @param {Statistics} statistics */
    set: (statistics = getStatisticsTemplate()) => write(paths.statisticsFile, statistics),
};

// Replay files
const replays = {
    list: () => {
        const payload = [];
        const items = readdirSync(paths.replayFolder);
        for (const i of items) {
            const stats = statSync(join(paths.replayFolder, i));
            payload.push({name: i, size: stats.size});
        }

        payload.reverse();
        const listable = payload.slice(0, 5);
        const toRemove = payload.slice(5).map(r => r.name);
        for (const i of toRemove) rmSync(join(paths.replayFolder, i));

        return listable;
    },
    /** @returns {import("./class/game/Replay").ReplayContent} */
    read: (name) => read(name.replace(/^%%r/, paths.replayFolder)),
    write: (name, data, onfinished) => write(join(paths.replayFolder, name), data, 0, onfinished),
    delete: (name) => rmSync(join(paths.replayFolder, name), {force: true}),
    validate: async (path) => {
        return new Promise((resolve, reject) => {
            readFile(path.replace(/^%%r/, paths.replayFolder), (err, res) => {
                if (err) reject(err.message); else {
                    const data = new TextDecoder().decode(res);
                    let json;
                    try { 
                        json = JSON.parse(data);
                        if (json.version && json.theme && json.frames) resolve();
                        else reject("That does not look like a replay!");
                    } catch { reject("That does not look like a replay!") }
                }
            });
        });
    },
    export: async (name, destination) => {
        return new Promise((resolve, reject) => {
            if (parse(destination).dir === paths.replayFolder) reject("Cannot export into replay directory!");
            else copyFile(join(paths.replayFolder, name), destination, (err) => {
                if (err) reject(err.message); else {
                    replays.list(); // remove the older replays
                    resolve(destination);
                }
            });
        });
    }
};

/**
 * Get the amount of free space. Useful for replay record checking.
 * @returns {number} - The amount of gigabytes free on the disk of the app data folder.
 */
const space = () => {
    const stats = statfsSync(app.getPath("appData"));
    return stats.bsize * stats.bfree / 1e9;
};

/**
 * Initiate and check files and folders, recommended on game start.
 */
const init = () => {
    paths.mainFolder = join(app.getPath("appData"), app.name);
    paths.settingsFile = join(paths.mainFolder, "settings.json");
    paths.statisticsFile = join(paths.mainFolder, "statistics.json");
    paths.replayFolder = join(paths.mainFolder, "replays");

    if (!existsSync(paths.mainFolder)) mkdirSync(paths.mainFolder);
    if (!existsSync(paths.replayFolder)) mkdirSync(paths.replayFolder);
    if (!existsSync(paths.statisticsFile)) statistics.set();

    if (!existsSync(paths.settingsFile)) settings.set(); else {
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

module.exports = {init, space, settings, statistics, replays};
