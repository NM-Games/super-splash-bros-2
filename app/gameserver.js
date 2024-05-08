/**
 * This script is executed with utilityProcess.fork(), DO NOT require() it!
 * Because the close() method is broken, we cannot start/stop the WebSocketServer,
 * we have to use an independent script that only runs when it's needed.
 */

/**
 * @typedef {"join" | "update" | "keys"} SocketActions
 * @typedef {{
 *  act: SocketActions,
 *  version: string,
 *  index?: number,
 *  appearance?: import("./preload/settings").Settings["appearance"],
 *  keys?: import("./preload/settings").Settings["controls"],
 * }} SocketData
 */

const { WebSocketServer } = require("ws");

const { port } = require("./network");
const { cycle } = require("./preload/theme");
const { version } = require("../package.json");
const Game = require("./class/game/Game");


process.parentPort.on("message", (msg) => {
    console.log(`Incoming post message: ${msg.data}`);

    if (msg.data === "start") game.start();
    else if (msg.data === "theme") game.theme = cycle(game.theme);
    else if (msg.data.startsWith("theme:")) game.theme = msg.data.slice(6);
    else if (msg.data.startsWith("ban:")) game.ban(+msg.data.slice(4));
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

                if (clientIndex === -1 && game.blacklist.includes(client.ip)) client.close(1000, "You have been banned from this game!");
                else if (error && clientIndex > -1) game.remove(clientIndex);
                else client.send(JSON.stringify(game.export()));
            });
        });
        game.update();
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

    if (game.blacklist.includes(request.socket.remoteAddress)) socket.close(1000, "You are banned from that game!");
    else if (game.startState > 0) socket.close(1000, "That game has already started!");

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
            else send({act: "join", index: join}); // welcome player to game
        } else if (json.act === "keys") {

        }
    });
    socket.on("close", () => {
        const clientIndex = game.ips.indexOf(socket.ip);
        if (clientIndex > -1) game.remove(clientIndex);
    });
});
