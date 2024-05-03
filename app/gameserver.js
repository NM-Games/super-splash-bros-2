/**
 * This script is executed with utilityProcess.fork(), DO NOT require() it!
 * Because the close() method is broken, we cannot start/stop the WebSocketServer,
 * we have to use an independent script that only runs when it's needed.
 */
/**
 * @typedef {"join" | "leave" | "keys"} SocketActions
 */

const { WebSocketServer } = require("ws");

const { port } = require("./network");


const wss = new WebSocketServer({port});

wss.on("listening", () => {
    process.parentPort.postMessage("listening");
});

wss.on("connection", (socket) => {
    socket.on("message", (data) => {
        const payload = Buffer.isBuffer(data) ? new TextDecoder().decode(data) : data;
        console.log(`Incoming socket message: ${payload}`);
    });
});
