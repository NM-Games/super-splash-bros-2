/**
 * @typedef {{
 *  changeName: boolean,
 *  remapKeybind: boolean,
 *  firstPowerup: boolean,
 *  maxDamage: boolean,
 *  leaveAfterRespawning: boolean,
 *  watchReplay: boolean,
 *  exportReplay: boolean,
 *  winLocal: boolean,
 *  winLAN: boolean,
 *  rocketRide: boolean,                    // done
 *  deflectWithForceField: boolean,         // done
 *  hitByOwnRocket: boolean,                // done
 *  exclusiveWaterSave: boolean,
 *  winFreeplayHard: boolean
 * }} Achievements
 */

const list = {
    changeName: {
        name: "A new identity",
        description: "Change your player name",
        rarity: 0
    },
    remapKeybind: {
        name: "Gotta get used to that",
        description: "Remap a keybind",
        rarity: 0
    },
    firstPowerup: {
        name: "Out of the way!",
        description: "Perform your first power-up",
        rarity: 0
    },
    maxDamage: {
        name: "Peak damage",
        description: "Reach 500% damage",
        rarity: 0
    },
    leaveAfterRespawning: {
        name: "Rage quit",
        description: "Leave the match shortly after respawning",
        rarity: 0
    },
    watchReplay: {
        name: "Reflector",
        description: "Watch a replay",
        rarity: 0
    },
    exportReplay: {
        name: "Permanent memory",
        description: "Export a replay",
        rarity: 0
    },
    winLocal: {
        name: "Controller master",
        description: "Win a game in Local mode",
        rarity: 0,
    },
    winLAN: {
        name: "Dominating the network",
        description: "Win a game in LAN mode",
        rarity: 0
    },
    rocketRide: {
        name: "Free transport",
        description: "Ride a rocket",
        rarity: 1
    },
    deflectWithForceField: {
        name: "Not today, thank you",
        description: "Deflect an attack with your Force Field",
        rarity: 1
    },
    hitByOwnRocket: {
        name: "Accidental Kaboom",
        description: "Get hit by your own rocket",
        rarity: 2
    },
    exclusiveWaterSave: {
        name: "Phew, that was close!",
        description: "Use an Exclusive Platform to narrowly miss the water",
        rarity: 2
    },
    winFreeplayHard: {
        name: "I'm in control now.",
        description: "Win a game in Freeplay mode on Hard difficulty",
        rarity: 2
    }
};

const renderer = {
    queue: [],
    shown: null,
    shownAt: -6e9,
    y: 0,
    /** @param {string} key */
    grant: function(key) {
        this.queue.push(list[key]);
    },
    update: function() {
        const now = new Date().getTime();
        if (!this.shown) {
            this.shown = this.queue.shift();
            this.shownAt = now;
        } else if (now - this.shownAt >= 5000) this.shown = null;
        else {
            // todo: update achievement UI
        }
    }
};

/** @type {Achievements} */
const template = {};
for (let i in list) template[i] = false;

/** @returns {Achievements} */
const getTemplate = () => JSON.parse(JSON.stringify(template));

module.exports = {list, getTemplate, renderer};
