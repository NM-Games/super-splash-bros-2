/**
 * This script is executed with utilityProcess.fork(), DO NOT require() it!
 * Because the close() method is broken, we cannot start/stop the WebSocketServer,
 * we have to use an independent script that only runs when it's needed.
 */

/**
 * @typedef {"join" | "update" | "keys" | "error"} SocketActions
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
                const clientIndex = game.ips.indexOf(client.ip);

                if (clientIndex === -1 && game.blacklist.includes(client.ip)) client.send(JSON.stringify({act: "error", message: "You have been banned from this game!"}));
                else if (clientIndex === -1) client.send(JSON.stringify({act: "error", message: "You have been kicked from this game!"}));
                else if (error && clientIndex > -1) game.kick(clientIndex);
                else client.send(JSON.stringify(game.export()));
            });
        });
    }, 17);    
});

wss.on("connection", (socket, request) => {
    /**
     * Send data to clients.
     * @param {object} data
     */
    const send = (data) => {
        socket.send(JSON.stringify(data));
    };

    socket.ip = request.socket.remoteAddress;
    socket.on("message", (data) => {
        const payload = Buffer.isBuffer(data) ? new TextDecoder().decode(data) : data;
        console.log(`Incoming socket message: ${payload}`);
        
        /** @type {SocketData} */
        let json;
        try {
            json = JSON.parse(payload);
        } catch { return }

        if (json.version !== version) {
            socket.close(1000, "Your version does not match with the host!");
        } else if (json.act === "join") {
            const join = game.join(json.appearance, socket.ip);
            if (join === -1) socket.close(1000, "That game is already full!");
            else if (join === -2) socket.close(1000, "You are banned from that game!");
            else send({act: "join"}); // welcome player to game
        } else if (json.act === "keys") {

        }
    });
    socket.on("close", () => {
        const clientIndex = game.ips.indexOf(socket.ip);
        if (clientIndex > -1) game.kick(clientIndex);
    });
});
