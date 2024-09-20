/**
 * @typedef {{
 *  changeName: boolean,                    // done
 *  remapKeybind: boolean,                  // done
 *  firstPowerup: boolean,                  // done
 *  maxDamage: boolean,                     // done
 *  leaveAfterRespawning: boolean,          // done
 *  watchReplay: boolean,                   // done
 *  exportReplay: boolean,                  // done
 *  winLAN: boolean,                        // done
 *  maxLives: boolean,                      // done
 *  rocketRide: boolean,                    // done
 *  deflectWithForceField: boolean,         // done
 *  hitByOwnRocket: boolean,                // done
 *  exclusiveWaterSave: boolean,            // done
 *  winFreeplayHard: boolean                // done
 * }} Achievements
 * 
 * @typedef {"changeName" |
 *  "remapKeybind" |
 *  "firstPowerup" |
 *  "maxDamage" |
 *  "leaveAfterRespawning" |
 *  "watchReplay" |
 *  "exportReplay" |
 *  "winLAN" |
 *  "maxLives" |
 *  "rocketRide" |
 *  "deflectWithForceField" |
 *  "hitByOwnRocket" |
 *  "exclusiveWaterSave" |
 *  "winFreeplayHard"} AchievementKeys
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
    winLAN: {
        name: "Dominating the network",
        description: "Win a game in LAN mode",
        rarity: 0
    },
    maxLives: {
        name: "Not losing today",
        description: "Have 5 lives",
        rarity: 1,
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
    duration: 7000,
    y: -100,
    vy: 0,
    sprites: [],
    /** @param {AchievementKeys} key */
    grant: function(key) {
        const { ipcRenderer } = require("electron");
        ipcRenderer.send("can-grant-achievement", key);
        ipcRenderer.once("achievement-granted", () => this.queue.push(list[key]));
    },
    update: function() {
        const now = new Date().getTime();
        if (!this.shown) {
            this.shown = this.queue.shift();
            this.shownAt = now;
            this.vy = 15;
        } else if (now - this.shownAt >= this.duration && this.y < -100) {
            this.shown = null;
            this.sprites.splice(0, this.sprites.length);
        } else {
            this.y += this.vy;
            if (now - this.shownAt >= this.duration) this.vy -= 0.3;
            else this.vy = Math.max(0, this.vy - 0.5);

            for (let i=0; i<12; i++) {
                if (now - this.shownAt >= i * 200 && this.sprites.length === i) this.sprites.push({
                    x: (i % 2 - 0.5) * i * 40 - 24,
                    y: -100,
                    vy: 11 + i * 0.5,
                    color: Math.round(Math.random() * 8)
                });
            }

            for (const sprite of this.sprites) {
                sprite.y += sprite.vy;
                sprite.vy -= 0.2;
            }
        }
    }
};

/** @type {Achievements} */
const template = {};
for (let i in list) template[i] = false;

/** @returns {Achievements} */
const getAchievementTemplate = () => JSON.parse(JSON.stringify(template));

module.exports = {list, getAchievementTemplate, achievement: renderer};
