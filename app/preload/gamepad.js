let items = new Array(4).fill(null);

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


};

module.exports = {get, set, update};
