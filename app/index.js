const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require("electron");
const { join } = require("path");

const network = require("./network");
const gameserver = require("./gameserver");


/** @type {BrowserWindow} */
let window;

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
            width: 1250,
            height: 700,
            minHeight: 700,
            minWidth: 1100,
            webPreferences: {
                sandbox: false,
                contextIsolation: false,
                preload: join(__dirname, "window", "preload.js")
            }
        });
    
        window.removeMenu();
        window.setTitle("Super Splash Bros 2");
        window.loadFile(join(__dirname, "window", "index.html"));
        window.setIcon(join(__dirname, "assets", "img", "icon.png"));
        // window.webContents.openDevTools();
    
        window.on("ready-to-show", () => {
            window.webContents.send("fullscreen-status", window.isFullScreen());
            window.show();
        });

        ipcMain.on("quit", () => app.quit());
        
        ipcMain.on("toggle-fullscreen", toggleFullScreen);
        globalShortcut.register("F11", toggleFullScreen);
        window.on("enter-full-screen", () => {
            window.webContents.send("fullscreen-status", true);
        });
        window.on("leave-full-screen", () => {
            window.webContents.send("fullscreen-status", false);
        });
    }).catch((err) => {
        dialog.showErrorBox("Cannot start Super Splash Bros 2", `${err}: The Super Splash Bros 2 port, ${network.port}, is already in use.`);
        app.exit(2);
    });
});
