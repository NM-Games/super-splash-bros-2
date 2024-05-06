/**
 * @typedef {import("../gameserver").SocketData} SocketData
 * 
 * @callback EmptyCallback
 */

const { port } = require("../network");
const { version } = require("../../package.json");

/** @type {WebSocket} */
let ws;
let game;

/** 
 * Get the game as a client.
 * @type {import("../class/game/Game")["export"]}
 */
const getGame = () => game;
/**
 * Check whether the socket is open.
 * @returns {boolean}
 */
const isOpen = () => (ws && ws.readyState === ws.OPEN);

/**
 * Send data through a WebSocket.
 * @param {SocketData} data
 */
const send = (data) => {
    if (!ws || ws.readyState !== ws.OPEN) return;

    const payload = (typeof data === "string") ? data : JSON.stringify(data);
    ws.send(payload);
};
/**
 * Parse data received through a WebSocket.
 * @param {string | Buffer} data
 * @returns {SocketData}
 */
const parse = (data) => {
    const payload = Buffer.isBuffer(data) ? new TextDecoder().decode(data) : data;
    try {
        return JSON.parse(payload);
    } catch {
        return {}
    }
};

/**
 * Connect with a Super Splash Bros server.
 * @param {{
 *  ip: string,
 *  appearance: import("./settings").Settings["appearance"]
 *  timeout?: number,
 *  onopen?: EmptyCallback,
 *  onclose?: EmptyCallback,
 *  onerror?: EmptyCallback,
 *  ontimeout?: EmptyCallback
 * }} options
 */
const open = (options) => {
    ws = new WebSocket(`ws://${options.ip}:${port}`);

    const connectTimeout = setTimeout(() => {
        if (options.ontimeout) options.ontimeout();
    }, options.timeout ?? 10000);

    ws.addEventListener("open", () => {
        if (options.onopen) options.onopen();
        clearTimeout(connectTimeout);
        send({act: "join", version, appearance: options.appearance});
    });
    ws.addEventListener("close", () => {
        if (options.onclose) options.onclose();
        clearTimeout(connectTimeout);
        ws = undefined;
    });
    ws.addEventListener("error", () => {
        if (options.onerror) options.onerror();
    });
    ws.addEventListener("message", (e) => {
        game = parse(e.data);
    });
};

const close = () => {
    if (ws) ws.close();
};

module.exports = {open, close, isOpen, getGame};
