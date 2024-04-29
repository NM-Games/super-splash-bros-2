const { WebSocketServer } = require("ws");
const { EventEmitter } = require("events");

const { port } = require("./network");


/** @type {WebSocketServer} */
let wss;
const game = new EventEmitter();

const start = () => {
    wss = new WebSocketServer({port});
    wss.on("connection", (socket) => {
        console.log("Connection!");
        socket.on("message", (data) => {
            const payload = Buffer.isBuffer(data) ? new TextDecoder().decode(data) : data;
            console.log(`Message: ${payload}`);
        });
    });
    wss.on("listening", () => {
        game.emit("listening");
    });
    wss.on("close", () => {
        console.log("Powered off.");
    });
};

const stop = () => {
    if (typeof wss === "object") {
        wss.close();
        wss = undefined;
    }
};

module.exports = {start, stop, game};
