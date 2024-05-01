/**
 * This script is executed with utilityProcess.fork(), DO NOT require() it!
 * Because the close() method is broken, this is the only way to make the port usable again.
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
        console.log(`Incoming socket essage: ${payload}`);
    });
});
