const { app, BrowserWindow, Menu, ipcMain, screen, dialog, utilityProcess } = require("electron");
const { join } = require("path");

const { displayName, version } = require("../package.json");
const network = require("./network");
const file = require("./file");
const discord = require("./discord");


/** @type {BrowserWindow} */
let window;
/** @type {Electron.UtilityProcess} */
let gameserver;

app.setName(displayName);
if (process.platform === "darwin") {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{
        label: app.name,
        submenu: [
            {role: "about"},
            {type: "separator"},
            {role: "hide"},
            {role: "hideOthers"},
            {role: "unhide"},
            {type: "separator"},
            {role: "quit"}
        ]
    }]));
}

app.whenReady().then(() => {
    if (!app.requestSingleInstanceLock()) {
        dialog.showErrorBox(`Cannot start ${app.name}`, "You already have an instance running on this device!");
        app.exit(1);
        return;
    }
    file.init();

    const toggleFullScreen = () => {
        window.setFullScreen(!window.isFullScreen());
    };

    window = new BrowserWindow({
        show: false,
        width: 1350,
        height: 800,
        minHeight: 800,
        minWidth: 1350,
        webPreferences: {
            sandbox: false,
            devTools: !app.isPackaged,
            preload: join(__dirname, "preload", "index.js")
        }
    });

    window.maximize();
    window.removeMenu();
    window.setTitle(app.name);
    window.loadFile(join(__dirname, "window", "index.html"));
    window.setIcon(join(__dirname, "img", "icons", "128x128.png"));

    window.on("ready-to-show", () => {
        let totalWidth = 0;
        for (const scr of screen.getAllDisplays()) totalWidth += scr.bounds.width;
        window.webContents.send("start",
            file.settings.get(),
            {game: version, electron: process.versions.electron, chromium: process.versions.chrome},
            file.space(),
            totalWidth
        );
        
        window.webContents.send("fullscreen-status", window.isFullScreen());
        window.show();
    });

    const beforeClose = (e) => {
        e.preventDefault();
        window.webContents.send("quit-check");
    };

    ipcMain.on("quit", () => {
        window.off("close", beforeClose);
        app.quit();
    });
    window.on("close", beforeClose);

    ipcMain.on("toggle-fullscreen", toggleFullScreen);
    ipcMain.on("toggle-devtools", () => window.webContents.openDevTools());
    window.on("enter-full-screen", () => {
        window.webContents.send("fullscreen-status", true);
    });
    window.on("leave-full-screen", () => {
        window.webContents.send("fullscreen-status", false);
    });

    ipcMain.on("start-gameserver", (_e, theme) => {
        network.isPortAvailable(network.port).then(() => {
            gameserver = utilityProcess.fork(join(__dirname, "gameserver.js"));
            gameserver.postMessage(`theme:${theme}`);
            gameserver.on("message", (msg) => {
                if (msg === "listening") window.webContents.send("gameserver-created");
            });
        }).catch(err => {
            window.webContents.send("gameserver-error", err);
        });
    });
    ipcMain.on("stop-gameserver", (_e, playAgain) => {
        if (gameserver.kill()) window.webContents.send("gameserver-stopped", playAgain);
    });

    ipcMain.on("update-config", (_e, config) => file.settings.set(config));

    ipcMain.on("lan-cycle-theme", () => gameserver.postMessage("theme"));
    ipcMain.on("lan-unban", () => gameserver.postMessage("unban"));
    ipcMain.on("lan-ban", (_e, index) => gameserver.postMessage(`ban:${index}`));
    ipcMain.on("lan-start", () => gameserver.postMessage("start"));

    ipcMain.on("get-replays", () => window.webContents.send("replay-list", file.replays.list()));
    ipcMain.on("load-replay", (_e, name) => window.webContents.send("replay-loaded", file.replays.read(name)));
    ipcMain.on("save-replay", (_e, name, data) => file.replays.write(`${name}.ssb2replay`, data));
    ipcMain.on("export-replay", (_e, name) => {
        dialog.showSaveDialog(window, {
            title: "Export replay",
            defaultPath: join(app.getPath("home"), name),
            filters: [{name: "Super Splash Bros 2 Replay", extensions: ["ssb2replay"]}]
        }).then((res) => {
            if (res.canceled) return;

            window.webContents.send("replay-export-started");
            file.replays.export(name, res.filePath)
             .then((path) => window.webContents.send("replay-export-finished", path))
             .catch((err) => window.webContents.send("replay-export-error", err));
        });
    });
    ipcMain.on("delete-replay", (_e, name) => file.replays.delete(name));

    ipcMain.on("discord-activity-update", (_e, state, playerIndex, playerName, partySize, partyMax, startTimestamp) => {
        discord({
            state,
            player: {index: playerIndex, name: playerName},
            party: {size: partySize, max: partyMax},
            startTimestamp
        });
    });
});
