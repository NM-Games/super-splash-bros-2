const { app, BrowserWindow, dialog, globalShortcut } = require("electron");
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
        window.webContents.openDevTools();
    
        window.on("ready-to-show", () => window.show());

        globalShortcut.register("F11", () => {
            window.setFullScreen(!window.isFullScreen());
        });
    }).catch((err) => {
        dialog.showErrorBox("Cannot start Super Splash Bros 2", `${err}: The Super Splash Bros 2 port, ${network.port}, is already in use.`);
        app.exit(2);
    });
});
