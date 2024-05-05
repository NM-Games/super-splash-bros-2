/**
 * This script is executed with utilityProcess.fork(), DO NOT require() it!
 * Because the close() method is broken, we cannot start/stop the WebSocketServer,
 * we have to use an independent script that only runs when it's needed.
 */

/**
 * @typedef {"join" | "leave" | "keys"} SocketActions
 * @typedef {{
 *  act: SocketActions,
 *  version: string,
 *  appearance: import("./preload/settings").Settings["appearance"]
 * }} SocketData
 */

const { WebSocketServer } = require("ws");

const { port } = require("./network");
const { version } = require("../package.json");
const Game = require("./class/game/Game");


process.parentPort.on("message", (msg) => {
    if (msg.data === "start") game.start();
    else if (msg.data.startsWith("kick:")) game.kick(+msg.data.slice(5));
});

const game = new Game();
const wss = new WebSocketServer({port});

let frames = 0;
let connectedClients = 0;

wss.on("listening", () => {
    process.parentPort.postMessage("listening");
    setInterval(() => {
        frames++;
    
        connectedClients = [...wss.clients].length;
        wss.clients.forEach((client) => {
            client.ping("", false, (error) => {
                console.log("Client IP:");
                console.log(client.ip);
            })
            client.send(`Frame update ${frames}`);
            client.send(JSON.stringify(game.export()));
        });
    }, 17);    
});

wss.on("connection", (socket, request) => {
    socket.ip = request.socket.remoteAddress;
    socket.on("message", (data) => {
        const payload = Buffer.isBuffer(data) ? new TextDecoder().decode(data) : data;
        console.log(`Incoming socket message: ${payload}`);
        
        /** @type {SocketData} */
        let json;
        try {
            json = JSON.parse(payload);
        } catch { return }

        if (json.version !== version) return;

        if (json.act === "join") {
            console.log(`Joining: ${game.join(json.appearance, socket.ip)}`);
        } else if (json.act === "leave") {
            
        } else if (json.act === "keys") {

        }
    });
});
