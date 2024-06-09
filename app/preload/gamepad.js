const { getButtonById } = require("../class/ui/Button");
const { getInputById } = require("../class/ui/Input");

const playerIndexes = [3, 2, 1, 6];
/** @type {(Gamepad | null)[]} */
let items = new Array(4).fill(null);
/** @type {boolean[]} */
let lastConnectionState = new Array(4).fill(true);
/** @type {boolean[]} */
let prohibitReconnecting = new Array(4).fill(false);

/**
 * Get the current available gamepads.
 * @returns {(Gamepad | null)[]}
 */
const get = () => items;

/**
 * @param {Gamepad} gamepad
 * @param {boolean} connected
 * Set a gamepad connection state
 */
const set = (gamepad, connected) => {
    if (connected) items[gamepad.index] = gamepad;
    else items[gamepad.index] = null;
};

/**
 * Update the controllers.
 * @param {import("../class/game/Game")} instance
 */
const update = (instance) => {
    items = navigator.getGamepads();

    const names = [];
    for (let i=0; i<items.length; i++) {
        const pi = playerIndexes[i];
        if (instance.players[pi] === null) continue;

        getInputById(`Local-Player${i}`).disabled =
        getButtonById(`Local-SuperpowerPrev-${i}`).disabled =
        getButtonById(`Local-SuperpowerNext-${i}`).disabled = (items[i] === null);

        instance.players[pi].name = getInputById(`Local-Player${i}`).value;
        instance.players[pi].connected = (items[i] !== null && !prohibitReconnecting[i]);
        if (lastConnectionState[i] && !instance.players[pi].connected && instance.startState > 0) prohibitReconnecting[i] = true;
        lastConnectionState[i] = instance.players[pi].connected;

        if (items[i] !== null) {
            names.push(instance.players[pi].name);
            if (instance.startState >= 6) {
                instance.players[pi].setKeys({
                    moveLeft: (items[i].axes[0] < -0.3),
                    moveRight: (items[i].axes[0] > 0.3),
                    jump: (items[i].buttons[0].pressed),
                    attack: (items[i].buttons[7].pressed),
                    launchRocket: (items[i].buttons[6].pressed),
                    activateSuperpower: (items[i].buttons[3].pressed),
                    gameMenu: false
                });
            }
        }

    }
    if (instance.startState === 0) prohibitReconnecting = new Array(4).fill(false);

    getButtonById("StartLocalGame").disabled = (
        instance.players.filter(p => p && p.connected).length <= 1 ||
        names.filter(x => x.length === 0).length > 0
    );
};

module.exports = {get, set, update, playerIndexes};
