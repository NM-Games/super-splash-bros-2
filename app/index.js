const { app, BrowserWindow, ipcMain, screen, dialog, globalShortcut, utilityProcess } = require("electron");
const { join } = require("path");

const network = require("./network");
const { version } = require("../package.json");


/** @type {BrowserWindow} */
let window;
/** @type {Electron.UtilityProcess} */
let gameserver;

app.on("ready", () => {
    if (!app.requestSingleInstanceLock()) {
        dialog.showErrorBox("Cannot start Super Splash Bros 2", "You already have an instance running on this device!");
        app.exit(1);
        return;
    }

    const toggleFullScreen = () => {
        window.setFullScreen(!window.isFullScreen());
    };

    network.isPortAvailable(network.port).then(() => {
        window = new BrowserWindow({
            show: false,
            width: 1350,
            height: 700,
            minHeight: 700,
            minWidth: 1350,
            webPreferences: {
                sandbox: false,
                contextIsolation: false,
                preload: join(__dirname, "preload", "index.js")
            }
        });
    
        window.maximize();
        window.removeMenu();
        window.setTitle("Super Splash Bros 2");
        window.loadFile(join(__dirname, "window", "index.html"));
        window.setIcon(join(__dirname, "img", "icon.png"));
        window.webContents.on("dom-ready", () => {
            let totalWidth = 0;
            for (const scr of screen.getAllDisplays()) totalWidth += scr.bounds.width;

            window.webContents.send("information", version, process.versions.electron, process.versions.chrome, totalWidth);
        });
        // window.webContents.openDevTools();
    
        window.on("ready-to-show", () => {
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
        globalShortcut.register("F11", toggleFullScreen);
        window.on("enter-full-screen", () => {
            window.webContents.send("fullscreen-status", true);
        });
        window.on("leave-full-screen", () => {
            window.webContents.send("fullscreen-status", false);
        });

        ipcMain.on("start-gameserver", () => {
            gameserver = utilityProcess.fork(join(__dirname, "gameserver.js"));
            gameserver.on("message", (msg) => {
                if (msg === "listening") window.webContents.send("gameserver-created");
            });
        });
        ipcMain.on("stop-gameserver", () => {
            if (gameserver.kill()) window.webContents.send("gameserver-stopped");
        });
    }).catch((err) => {
        dialog.showErrorBox("Cannot start Super Splash Bros 2", `${err}: The Super Splash Bros 2 port, ${network.port}, is already in use.`);
        app.exit(2);
    });
});
