const { app, BrowserWindow, Menu, ipcMain, screen, dialog, globalShortcut, utilityProcess } = require("electron");
const { join } = require("path");

const network = require("./network");
const { version } = require("../package.json");
const configfile = require("./configfile");
const discord = require("./discord");


/** @type {BrowserWindow} */
let window;
/** @type {Electron.UtilityProcess} */
let gameserver;

app.setName("Super Splash Bros 2");
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
    configfile.init();

    const toggleFullScreen = (init) => {
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
            contextIsolation: false,
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
        window.webContents.send("fullscreen-status", window.isFullScreen());

        let totalWidth = 0;
        for (const scr of screen.getAllDisplays()) totalWidth += scr.bounds.width;
        window.webContents.send("start",
            configfile.get(),
            {game: version, electron: process.versions.electron, chromium: process.versions.chrome},
            totalWidth
        );

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
    globalShortcut.register("F11", toggleFullScreen);
    globalShortcut.register("F12", () => window.webContents.openDevTools());
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
    ipcMain.on("stop-gameserver", () => {
        if (gameserver.kill()) window.webContents.send("gameserver-stopped");
    });

    ipcMain.on("update-config", (_e, config) => configfile.set(config));

    ipcMain.on("lan-cycle-theme", () => gameserver.postMessage("theme"));
    ipcMain.on("lan-unban", () => gameserver.postMessage("unban"));
    ipcMain.on("lan-ban", (_e, index) => gameserver.postMessage(`ban:${index}`));
    ipcMain.on("lan-start", () => gameserver.postMessage("start"));

    ipcMain.on("discord-activity-update", (_e, state, playerIndex, playerName, partySize, partyMax, startTimestamp) => {
        discord.setActivity({
            state,
            player: {index: playerIndex, name: playerName},
            party: {size: partySize, max: partyMax},
            startTimestamp
        });
    });
});
