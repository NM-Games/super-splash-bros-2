let items = new Array(4).fill(null);

/**
 * @param {Gamepad} gamepad
 * @param {boolean} connected
 * Set a gamepad connection state
 */
const set = (gamepad, connected) => {
    if (connected) items[gamepad.index] = gamepad;
    else items[gamepad.index] = null;
};

/** Update the controllers. */
const update = () => {
    items = navigator.getGamepads();
    
};

module.exports = {items, set, update};
