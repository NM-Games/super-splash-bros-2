/**
 * @typedef {{act: import("../gameserver").SocketActions, version: string}} SocketData
 * 
 * @callback EmptyCallback
 */

const { port } = require("../network");
const { version } = require("../../package.json");

/** @type {WebSocket} */
let ws;

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
    return JSON.parse(payload);
};

/**
 * Connect with a Super Splash Bros server.
 * @param {{
 *  ip: string,
 *  asHost?: boolean,
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
        send({act: "join", version, asHost: options.asHost ?? false, appearance: options.appearance});
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
        const data = parse(e.data);
    });
};

const close = () => {
    if (ws) ws.close();
};

module.exports = {open, close};
