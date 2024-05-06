const { ipcRenderer, clipboard, shell } = require("electron");

const c = require("./canvas");
const image = require("./image");
const theme = require("./theme");
const socket = require("./socket");
const settings = require("./settings");
const network = require("../network");
const Button = require("../class/ui/Button");
const Input = require("../class/ui/Input");
const MenuSprite = require("../class/ui/MenuSprite");


const state = {
    MAIN_MENU: 0,
    LOCAL_GAME_MENU: 1,
    LAN_GAME_MENU: 2,
    WAITING_LOCAL: 3,
    WAITING_LAN_HOST: 4,
    WAITING_LAN_GUEST: 5,
    PLAYING_FREEPLAY: 6,
    PLAYING_LOCAL: 7,
    PLAYING_LAN: 8,
    SETTINGS: 9,
    ABOUT: 10,

    current: 0,
    change: {
        /**
         * Change the current game state.
         * @param {number} toState
         * @param {boolean} inverted
         * @param {import("./socket").EmptyCallback} onchanged
         */
        to: (toState, inverted, onchanged = () => {}) => {
            state.change.newState = toState;
            state.change.vx = (inverted) ? 150 : -150;
            state.change.active = true;
            state.change.onfinished = onchanged;
        },
        active: false,
        newState: 0,
        onfinished: () => {},
        x: 0,
        vx: 0
    }
};

/**
 * Enable or disable the connect elements in the LAN mode menu.
 * @param {boolean} disabled
 */
const setConnectElementsState = (disabled) => {
    Button.getButtonById("Connect").hovering =
    Button.getButtonById("CreateGame").hovering =
    Button.getButtonById(`Back-${state.LAN_GAME_MENU}`).hovering =
    Input.getInputById("IP-1").hovering =
    Input.getInputById("IP-2").hovering =
    Input.getInputById("IP-3").hovering =
    Input.getInputById("IP-4").hovering = false;

    Button.getButtonById("CreateGame").disabled =
    Button.getButtonById(`Back-${state.LAN_GAME_MENU}`).disabled =
    Input.getInputById("IP-1").disabled =
    Input.getInputById("IP-2").disabled =
    Input.getInputById("IP-3").disabled =
    Input.getInputById("IP-4").disabled = disabled;

    Button.getButtonById("Connect").disabled = (disabled || !network.isValidIP(getEnteredIP()));
};

/**
 * Get the IP address entered in the LAN mode menu.
 * @returns {string[]}
 */
const getEnteredIP = () => {
    return [
        Input.getInputById("IP-1").value,
        Input.getInputById("IP-2").value,
        Input.getInputById("IP-3").value,
        Input.getInputById("IP-4").value
    ];
};

/**
 * Connect to a game.
 * @param {boolean} asHost
 */
const connect = (asHost) => {
    socket.open({
        ip: (asHost) ? "127.0.0.1" : getEnteredIP().join("."),
        appearance: config.appearance,
        onopen: () => {
            connectionMessage.show("");
            state.change.to(asHost ? state.WAITING_LAN_HOST : state.WAITING_LAN_GUEST, false, () => setConnectElementsState(false));
        },
        onclose: (e) => {
            if (state.current === state.LAN_GAME_MENU && e.reason) {
                connectionMessage.show(e.reason, theme.colors.error.foreground, 3);
                setConnectElementsState(false);
            } else {
                const reason = (e.reason) ? e.reason : "You have been disconnected because the game you were in was closed.";
                state.change.to(state.LAN_GAME_MENU, true, () => errorAlert.show(reason));
            }
        },
        onerror: () => {
            connectionMessage.show("Failed to connect!", theme.colors.error.foreground, 3);
            setConnectElementsState(false);
        },
        ontimeout: () => {
            connectionMessage.show("Connection timed out!", theme.colors.error.foreground, 3);
            setConnectElementsState(false);
        }
    });
};

/** Check the LAN availability and kick the player out of a menu if needed. */
const checkLANAvailability = () => {
    const LANavailable = (network.getIPs().length > 0);
    Button.getButtonById("LANMode").disabled = !LANavailable;
    if ([state.LAN_GAME_MENU, state.WAITING_LAN_GUEST, state.WAITING_LAN_HOST, state.PLAYING_LAN].includes(state.current) && !LANavailable)
        state.change.to(state.MAIN_MENU, true);
};

/** @type {import("./settings").Settings} */
const config = {appearance: {}, graphics: {}, controls: {}};
const versions = {game: "", electron: "", chromium: ""};
const water = {
    imageX: 0,
    x: 0,
    vx: -1,
    flood: { // flood effect on startup and game start
        enabled: true,
        level: 0, // from 0 to c.height()
        levelSpeed: 0,
        levelAcceleration: 0.5, // for enabling only
        enabling: false,
        disabling: false,
        enable: function() {
            if (this.enabling || this.disabling) return;
            
            this.enabled = true;
            this.enabling = true;
            this.levelSpeed = 0;
        },
        disable: function() {
            if (this.enabling || this.disabling) return;
            
            this.enabled = false;
            this.disabling = true;
            this.levelSpeed = Math.ceil(c.height() / 36);
        }
    }
};
const introLogo = {
    progress: 0,
    duration: 150,
    a: 0,
    va: 0.05,
    movement: 0,
    update: function() {
        if (this.progress >= this.duration) return;

        this.progress++;
        this.movement += 1;

        if (this.progress >= this.duration - (1 / this.va) - 15) this.a = Math.max(this.a - this.va, 0);
        else this.a = Math.min(this.a + this.va, 1);
    }
};
const dialog = {
    visible: false,
    header: "",
    text: "",
    /**
     * Show a dialog.
     * @param {string} header
     * @param {string} text
     * @param  {...Button} buttons 
     */
    show: (header, text, ...buttons) => {
        dialog.visible = true;
        dialog.header = header;
        dialog.text = text;
        Button.dialogItems = buttons;
    },
    close: () => {
        dialog.visible = false;
    }
};
const errorAlert = {
    visible: false,
    suppressed: false,
    y: -100,
    vy: 7,
    text: "",
    duration: 0,
    shownAt: -6e9,
    /** 
     * Show an error in the top of the screen.
     * @param {string} text
     * @param {number} duration
     */
    show: (text, duration = 5) => {
        if (errorAlert.suppressed) return;

        errorAlert.visible = true;
        errorAlert.text = text;
        errorAlert.duration = duration * 60;
        errorAlert.shownAt = frames;
    },
    /** Suppress the messages, useful when quitting deliberately. */
    suppress: () => {
        errorAlert.suppressed = true;
        setTimeout(() => errorAlert.suppressed = false, 500);
    }
};
const connectionMessage = {
    text: "",
    color: null, // null = theme dependent
    a: 1,
    shownAt: -6e9,
    duration: Infinity,
    /**
     * Show a connection message.
     * @param {string} text
     * @param {string | CanvasGradient | CanvasPattern | null} color
     * @param {number} duration
     */
    show: (text, color = null, duration = Infinity) => {
        connectionMessage.text = text;
        connectionMessage.color = color;
        connectionMessage.duration = duration * 60;
        connectionMessage.shownAt = frames;
        connectionMessage.a = 1;
    }
};
const konamiEasterEgg = {
    keys: ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"],
    index: 0,
    activated: false
};

let frames = 0;
let game = socket.getGame();

Button.items = [
    // Main menu
    new Button({
        text: "Local mode",
        state: state.MAIN_MENU,
        x: () => c.width(1/4),
        y: () => c.height(1/2) - 50,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.LOCAL_GAME_MENU, false);
        }
    }),
    new Button({
        id: "LANMode",
        text: "LAN mode",
        state: state.MAIN_MENU,
        x: () => c.width(1/2),
        y: () => c.height(1/2) - 50,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.LAN_GAME_MENU, false);
        }
    }),
    new Button({
        text: "Practice mode",
        state: state.MAIN_MENU,
        x: () => c.width(3/4),
        y: () => c.height(1/2) - 50,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.PLAYING_FREEPLAY, false, () => water.flood.enable());
        }
    }),
    new Button({
        text: "Settings",
        state: state.MAIN_MENU,
        x: () => c.width(1/3),
        y: () => c.height(3/4) - 100,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.SETTINGS, false);
        }
    }),
    new Button({
        text: "Quit game",
        state: state.MAIN_MENU,
        x: () => c.width(2/3),
        y: () => c.height(3/4) - 100,
        onclick: function() {
            this.hovering = false;
            ipcRenderer.send("quit");
        }
    }),
    // Local mode menu
    new Button({
        id: `Back-${state.LOCAL_GAME_MENU}`,
        text: "◂ Back",
        state: state.LOCAL_GAME_MENU,
        x: () => Button.width / 3 + 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.MAIN_MENU, true);
        }
    }),
    // LAN mode menu
    new Button({
        id: `Back-${state.LAN_GAME_MENU}`,
        text: "◂ Back",
        state: state.LAN_GAME_MENU,
        x: () => Button.width / 3 + 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.MAIN_MENU, true);
        }
    }),
    new Button({
        id: "CreateGame",
        text: "Create a game",
        state: state.LAN_GAME_MENU,
        x: () => c.width(1/2),
        y: () => c.height(1/4) + 20,
        onclick: function() {
            setConnectElementsState(true);
            ipcRenderer.send("start-gameserver", theme.current);
            ipcRenderer.once("gameserver-created", () => connect(true));
        }
    }),
    new Button({
        id: "Connect",
        text: "Connect",
        state: state.LAN_GAME_MENU,
        x: () => c.width(1/2),
        y: () => c.height(1/2) + Button.height + 100,
        disabled: true,
        onclick: function() {
            if (!network.isValidIP(getEnteredIP())) {
                connectionMessage.show("Invalid IP address!", theme.colors.error.foreground, 3);
            } else {
                setConnectElementsState(true);
                connectionMessage.show("Connecting...");
                connect(false);
            }
        }
    }),
    // Settings menu
    new Button({
        id: `Back-${state.SETTINGS}`,
        text: "◂ Back",
        state: state.SETTINGS,
        x: () => Button.width / 3 + 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.MAIN_MENU, true);
        }
    }),
    new Button({
        text: "About...",
        state: state.SETTINGS,
        x: () => c.width(1) - Button.width / 3 - 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.ABOUT, false);
        }
    }),
    // for the sprite color switch:
    new Button({
        text: "◂ Previous",
        state: state.SETTINGS,
        x: () => c.width(1/5) - Button.width / 4 - 20,
        y: () => 470,
        width: Button.width / 2,
        height: Button.height / 2,
        onclick: () => {
            if (config.appearance.preferredColor-- <= 0) config.appearance.preferredColor = 7;
            settings.set(config);
        }
    }),
    new Button({
        text: "Next ▸",
        state: state.SETTINGS,
        x: () => c.width(1/5) + Button.width / 4 + 20,
        y: () => 470,
        width: Button.width / 2,
        height: Button.height / 2,
        onclick: () => {
            if (config.appearance.preferredColor++ >= 7) config.appearance.preferredColor = 0;
            settings.set(config);
        }
    }),
    // for the superpower switch:
    new Button({
        text: "◂ Previous",
        state: state.SETTINGS,
        x: () => c.width(1/5) - Button.width / 4 - 20,
        y: () => 650,
        width: Button.width / 2,
        height: Button.height / 2,
        onclick: () => {
            if (config.appearance.superpower-- <= 0) config.appearance.superpower = 7;
            settings.set(config);
        }
    }),
    new Button({
        text: "Next ▸",
        state: state.SETTINGS,
        x: () => c.width(1/5) + Button.width / 4 + 20,
        y: () => 650,
        width: Button.width / 2,
        height: Button.height / 2,
        onclick: () => {
            if (config.appearance.superpower++ >= 7) config.appearance.superpower = 0;
            settings.set(config);
        }
    }),
    new Button({
        id: "Theme",
        text: "Theme",
        state: state.SETTINGS,
        x: () => c.width(1/2),
        y: () => 280,
        onclick: function() {
            config.graphics.theme = theme.current = theme.cycle();
            this.text = `Theme: ${theme.current}`;
            settings.set(config);
        }
    }),
    new Button({
        id: "Fullscreen",
        text: "Full screen",
        state: state.SETTINGS,
        x: () => c.width(1/2),
        y: () => 380,
        onclick: function() {
            ipcRenderer.send("toggle-fullscreen");
            this.hovering = false;
        }
    }),
    new Button({
        id: "WaterFlow",
        text: "Water flow",
        state: state.SETTINGS,
        x: () => c.width(1/2),
        y: () => 480,
        onclick: function() {
            config.graphics.waterFlow = !config.graphics.waterFlow;
            this.text = `Water flow: ${config.graphics.waterFlow ? "ON":"OFF"}`;
            settings.set(config);
        }
    }),
    new Button({
        id: "MenuSprites",
        text: "Menu sprites: ON",
        state: state.SETTINGS,
        x: () => c.width(1/2),
        y: () => 580,
        onclick: function() {
            config.graphics.menuSprites = !config.graphics.menuSprites;
            this.text = `Menu sprites: ${config.graphics.menuSprites ? "ON":"OFF"}`;
            settings.set(config);
        }
    }),
    // About menu
    new Button({
        id: `Back-${state.ABOUT}`,
        text: "◂ Back",
        state: state.ABOUT,
        x: () => Button.width / 3 + 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.SETTINGS, true);
        }
    }),
    new Button({
        text: "Website",
        state: state.ABOUT,
        x: () => c.width(1/2) - Button.width - 50,
        y: () => c.height(9/10) - 25,
        onclick: function() {
            shell.openExternal("https://nm-games.eu");
        }
    }),
    new Button({
        text: "GitHub",
        state: state.ABOUT,
        x: () => c.width(1/2),
        y: () => c.height(9/10) - 25,
        onclick: function() {
            shell.openExternal("https://github.com/NM-Games/super-splash-bros-2");
        }
    }),
    new Button({
        text: "Discord",
        state: state.ABOUT,
        x: () => c.width(1/2) + Button.width + 50,
        y: () => c.height(9/10) - 25,
        onclick: function() {
            shell.openExternal("https://discord.gg/CaMaGRXDqB");
        }
    }),
    // LAN game waiting menu (host)
    new Button({
        id: `Back-${state.WAITING_LAN_HOST}`,
        text: "◂ Quit",
        state: state.WAITING_LAN_HOST,
        x: () => Button.width / 3 + 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            if (game.connected > 1) {
                dialog.show("Are you sure you want to quit?", "Quitting will kick out everyone in your game.", new Button({
                    text: "Yes",
                    x: () => c.width(0.4),
                    y: () => c.height(0.75),
                    onclick: () => {
                        dialog.close();
                        ipcRenderer.send("stop-gameserver");
                    }
                }), new Button({
                    text: "No",
                    x: () => c.width(0.6),
                    y: () => c.height(0.75),
                    onclick: () => dialog.close()
                }));
            } else ipcRenderer.send("stop-gameserver");

            ipcRenderer.once("gameserver-stopped", () => {
                theme.current = config.graphics.theme;
                state.change.to(state.LAN_GAME_MENU, true);
                errorAlert.suppress();
            });        
        }
    }),
    new Button({
        id: "LANGameTheme",
        text: "Theme",
        state: state.WAITING_LAN_HOST,
        x: () => c.width(1/2) - 250,
        y: () => c.height(17/20),
        onclick: function() {
            ipcRenderer.send("lan-cycle-theme");
        }
    }),
    new Button({
        id: "StartLANGame",
        text: "Start!",
        state: state.WAITING_LAN_HOST,
        x: () => c.width(1/2) + 250,
        y: () => c.height(17/20),
        disabled: true,
        onclick: function() {
            // todo: start the game
        }
    }),
    // LAN game waiting menu (guest)
    new Button({
        id: `Back-${state.WAITING_LAN_GUEST}`,
        text: "◂ Leave",
        state: state.WAITING_LAN_GUEST,
        x: () => Button.width / 3 + 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            socket.close();
            errorAlert.suppress();
            this.hovering = false;
            state.change.to(state.LAN_GAME_MENU, true);
        }
    }),
];

Input.items = [
    new Input({
        id: "IP-1",
        state: state.LAN_GAME_MENU,
        x: () => c.width(1/2) - 180,
        y: () => c.height(1/2) + 100,
        width: 100,
        maxLength: 3,
        numbersOnly: true,
        onmaxlengthreached: function() {
            this.focused = false;
            setTimeout(() => Input.getInputById("IP-2").focused = true, 10);
        },
        ontab: function(shift) {
            if (!shift) this.onmaxlengthreached();
        },
        ontype: () => {
            Button.getButtonById("Connect").disabled = !network.isValidIP(getEnteredIP());
        }
    }),
    new Input({
        id: "IP-2",
        state: state.LAN_GAME_MENU,
        x: () => c.width(1/2) - 60,
        y: () => c.height(1/2) + 100,
        width: 100,
        maxLength: 3,
        numbersOnly: true,
        onmaxlengthreached: function() {
            this.focused = false;
            setTimeout(() => Input.getInputById("IP-3").focused = true, 10);
        },
        onemptybackspace: function() {
            this.focused = false;
            Input.getInputById("IP-1").focused = true;   
        },
        ontab: function(shift) {
            (shift) ? this.onemptybackspace() : this.onmaxlengthreached();
        },
        ontype: () => {
            Button.getButtonById("Connect").disabled = !network.isValidIP(getEnteredIP());
        }
    }),
    new Input({
        id: "IP-3",
        state: state.LAN_GAME_MENU,
        x: () => c.width(1/2) + 60,
        y: () => c.height(1/2) + 100,
        width: 100,
        maxLength: 3,
        numbersOnly: true,
        onmaxlengthreached: function() {
            this.focused = false;
            setTimeout(() => Input.getInputById("IP-4").focused = true, 10);
        },
        onemptybackspace: function() {
            this.focused = false;
            Input.getInputById("IP-2").focused = true;   
        },
        ontab: function(shift) {
            (shift) ? this.onemptybackspace() : this.onmaxlengthreached();
        },
        ontype: () => {
            Button.getButtonById("Connect").disabled = !network.isValidIP(getEnteredIP());
        }
    }),
    new Input({
        id: "IP-4",
        state: state.LAN_GAME_MENU,
        x: () => c.width(1/2) + 180,
        y: () => c.height(1/2) + 100,
        width: 100,
        maxLength: 3,
        numbersOnly: true,
        onemptybackspace: function() {
            this.focused = false;
            Input.getInputById("IP-3").focused = true;   
        },
        ontab: function(shift) {
            if (shift) this.onemptybackspace();
        },
        ontype: (blurred) => {
            Button.getButtonById("Connect").disabled = !network.isValidIP(getEnteredIP());
            if (blurred) Button.getButtonById("Connect").onclick();
        }
    }),
    new Input({
        id: "Username",
        state: state.SETTINGS,
        x: () => c.width(1/5),
        y: () => 285,
        width: Button.width + 50,
        size: 25,
        onblur: function() {
            if (this.value.trim().length === 0) this.value = settings.generatePlayerName();
            config.appearance.playerName = this.value.slice(0, this.maxLength);
            settings.set(config);
        }
    }),
    new Input({
        id: "Keybind-MoveLeft",
        state: state.SETTINGS,
        x: () => c.width(4/5) + 150,
        y: () => 240,
        width: 100,
        keybind: true,
        onkeybindselected: (key) => {
            config.controls.moveLeft = key;
            settings.set(config);
        }
    }),
    new Input({
        id: "Keybind-MoveRight",
        state: state.SETTINGS,
        x: () => c.width(4/5) + 150,
        y: () => 300,
        width: 100,
        keybind: true,
        onkeybindselected: (key) => {
            config.controls.moveRight = key;
            settings.set(config);
        }
    }),
    new Input({
        id: "Keybind-Jump",
        state: state.SETTINGS,
        x: () => c.width(4/5) + 150,
        y: () => 360,
        width: 100,
        keybind: true,
        onkeybindselected: (key) => {
            config.controls.jump = key;
            settings.set(config);
        }
    }),
    new Input({
        id: "Keybind-Attack",
        state: state.SETTINGS,
        x: () => c.width(4/5) + 150,
        y: () => 420,
        width: 100,
        keybind: true,
        onkeybindselected: (key) => {
            config.controls.attack = key;
            settings.set(config);
        }
    }),
    new Input({
        id: "Keybind-LaunchRocket",
        state: state.SETTINGS,
        x: () => c.width(4/5) + 150,
        y: () => 480,
        width: 100,
        keybind: true,
        onkeybindselected: (key) => {
            config.controls.launchRocket = key;
            settings.set(config);
        }
    }),
    new Input({
        id: "Keybind-ActivateSuperpower",
        state: state.SETTINGS,
        x: () => c.width(4/5) + 150,
        y: () => 540,
        width: 100,
        keybind: true,
        onkeybindselected: (key) => {
            config.controls.activateSuperpower = key;
            settings.set(config);
        }
    }),
    new Input({
        id: "Keybind-GameMenu",
        state: state.SETTINGS,
        x: () => c.width(4/5) + 150,
        y: () => 600,
        width: 100,
        keybind: true,
        onkeybindselected: (key) => {
            config.controls.gameMenu = key;
            settings.set(config);
        }
    })
];

addEventListener("DOMContentLoaded", () => {
    c.init();

    settings.init();
    const configFile = settings.get();
    config.appearance = configFile.appearance ?? settings.template.appearance;
    config.graphics = configFile.graphics ?? settings.template.graphics;
    config.controls = configFile.controls ?? settings.template.controls;

    checkLANAvailability();
    setInterval(checkLANAvailability, 5000);

    Input.getInputById("Username").value = config.appearance.playerName;

    theme.current = config.graphics.theme;
    Button.getButtonById("Theme").text = `Theme: ${theme.current}`;

    if (config.graphics.fullScreen) ipcRenderer.send("toggle-fullscreen");
    Button.getButtonById("WaterFlow").text = `Water flow: ${config.graphics.waterFlow ? "ON":"OFF"}`;
    Button.getButtonById("MenuSprites").text = `Menu sprites: ${config.graphics.menuSprites ? "ON":"OFF"}`;

    Input.getInputById("Keybind-MoveLeft").value = Input.displayKeybind(config.controls.moveLeft);
    Input.getInputById("Keybind-MoveRight").value = Input.displayKeybind(config.controls.moveRight);
    Input.getInputById("Keybind-Jump").value = Input.displayKeybind(config.controls.jump);
    Input.getInputById("Keybind-Attack").value = Input.displayKeybind(config.controls.attack);
    Input.getInputById("Keybind-LaunchRocket").value = Input.displayKeybind(config.controls.launchRocket);
    Input.getInputById("Keybind-ActivateSuperpower").value = Input.displayKeybind(config.controls.activateSuperpower);
    Input.getInputById("Keybind-GameMenu").value = Input.displayKeybind(config.controls.gameMenu);

    const ip = network.getIPs()[0] ?? "...";
    const ipFragments = ip.split(".");
    for (let i=0; i<3; i++) Input.getInputById(`IP-${i + 1}`).value = ipFragments[i];

    ipcRenderer.on("quit-check", () => {
        if ([state.PLAYING_LOCAL, state.PLAYING_LAN, state.PLAYING_FREEPLAY].includes(state.current)) {
            dialog.show("Are you sure you want to quit?", "You will not be able to rejoin this match.", new Button({
                text: "Yes",
                x: () => c.width(0.4),
                y: () => c.height(0.75),
                onclick: () => ipcRenderer.send("quit")
            }), new Button({
                text: "No",
                x: () => c.width(0.6),
                y: () => c.height(0.75),
                onclick: () => dialog.close()
            }));
        } else if (state.current === state.WAITING_LAN_HOST && game.connected > 1) {
            dialog.show("Are you sure you want to quit?", "Quitting will kick out everyone in your game.", new Button({
                text: "Yes",
                x: () => c.width(0.4),
                y: () => c.height(0.75),
                onclick: () => ipcRenderer.send("quit")
            }), new Button({
                text: "No",
                x: () => c.width(0.6),
                y: () => c.height(0.75),
                onclick: () => dialog.close()
            }));
        } else ipcRenderer.send("quit");
    });
    ipcRenderer.on("fullscreen-status", (_e, enabled) => {
        config.graphics.fullScreen = enabled;
        Button.getButtonById("Fullscreen").text = `Full screen: ${enabled ? "ON":"OFF"}`;
        settings.set(config);
    });
    ipcRenderer.on("information", (_e, gameV, electronV, chromiumV, maxWidth) => {
        versions.game = gameV;
        versions.electron = electronV;
        versions.chromium = chromiumV;
        MenuSprite.generate(maxWidth);
    });

    addEventListener("keydown", (e) => {
        const button = Button.getButtonById(`Back-${state.current}`);
        if (e.key === "Escape" && button !== null && !button.disabled) button.onclick();
        else if (e.key.toLowerCase() === "v" && e.ctrlKey && Input.getInputById("Username").focused) {
            Input.getInputById("Username").value += clipboard.readText();
            Input.getInputById("Username").value = Input.getInputById("Username").value.slice(0, Input.getInputById("Username").maxLength);
        } else if (e.key === konamiEasterEgg.keys[konamiEasterEgg.index]) {
            konamiEasterEgg.index++;
            if (konamiEasterEgg.index >= konamiEasterEgg.keys.length) konamiEasterEgg.activated = true;
        } else konamiEasterEgg.index = 0;
    });

    addEventListener("mousemove", (e) => {
        if (dialog.visible) {
            for (const button of Button.dialogItems) {
                button.hovering = (e.clientX > button.x() - button.width / 2 && e.clientX < button.x() + button.width / 2
                 && e.clientY > button.y() - button.height / 2 && e.clientY < button.y() + button.height / 2 && !button.disabled);
            }
        } else {
            for (const button of Button.items) {
                if (button.state !== state.current) {
                    button.hovering = false;
                    continue;
                }
    
                button.hovering = (e.clientX > button.x() - button.width / 2 && e.clientX < button.x() + button.width / 2 && !water.flood.enabled
                 && e.clientY > button.y() - button.height / 2 && e.clientY < button.y() + button.height / 2 && !button.disabled && !state.change.active);
            }
        }
        for (const input of Input.items) {
            if (input.state !== state.current) {
                input.hovering = false;
                continue;
            }

            input.hovering = (e.clientX > input.x() - input.width / 2 && e.clientX < input.x() + input.width / 2 && !water.flood.enabled && !dialog.visible
             && e.clientY > input.y() - input.getHeight(0.5) && e.clientY < input.y() + input.getHeight(0.5) && !input.disabled && !state.change.active);
        }
    });

    addEventListener("mousedown", (_e) => {
        for (const button of (dialog.visible ? Button.dialogItems : Button.items)) {
            if (button.hovering && !state.change.active) {
                button.active = true;
                break;
            }
        }
        for (const input of Input.items) {
            const oldFocused = input.focused;
            input.focused = (input.hovering && !state.change.active);
            if (oldFocused && !input.focused) input.onblur();
        }
    });
    addEventListener("mouseup", (_e) => {
        for (const button of (dialog.visible ? Button.dialogItems : Button.items)) {
            if (button.active && button.hovering && !button.disabled) {
                button.active = false;
                button.onclick();
                break;
            } else if (button.active) button.active = false;
        }
    });

    const update = () => {
        frames++;
        if (socket.isOpen()) game = socket.getGame();
        if (game) {
            Button.getButtonById("StartLANGame").disabled = (game.connected <= 1);
        }

        if (state.change.active) {
            state.change.x += state.change.vx;
            if (state.change.x < -c.width()) {
                state.current = state.change.newState;
                state.change.x = c.width();
                state.change.onfinished();
            } else if (state.change.x > c.width()) {
                state.current = state.change.newState;
                state.change.x = -c.width();
                state.change.onfinished();
            }

            if (state.current === state.change.newState && ((state.change.vx < 0 && state.change.x < 0) || (state.change.vx > 0 && state.change.x > 0))) {
                state.change.x = 0;
                state.change.active = false;
            }
        }

        introLogo.update();
        MenuSprite.update(frames, config.graphics.menuSprites, konamiEasterEgg.activated);

        let hoverings = {button: 0, input: 0};
        for (const button of (dialog.visible ? Button.dialogItems : Button.items)) {
            if (button.hovering) hoverings.button++;
        }
        for (const input of Input.items) {
            if (input.hovering) hoverings.input++;
        }

        if (frames - connectionMessage.shownAt >= connectionMessage.duration) connectionMessage.a = Math.max(connectionMessage.a - 0.05, 0);

        water.x += Number(config.graphics.waterFlow) * water.vx;
        if (water.x < -image.water.width) water.x = 0;
        if (water.flood.enabling) {
            water.flood.level -= water.flood.levelSpeed;
            water.flood.levelSpeed += water.flood.levelAcceleration;
            if (water.flood.level <= 0) {
                water.flood.level = 0;
                water.flood.enabling = false;
            }
        } else if (water.flood.disabling) {
            water.flood.level += water.flood.levelSpeed;
            water.flood.levelSpeed = Math.max(4, water.flood.levelSpeed / 1.025);
            if (water.flood.level >= c.height()) {
                water.flood.level = c.height();
                water.flood.disabling = false;
            }
        } else water.flood.level = (water.flood.enabled) ? 0 : c.height();
        if (frames === introLogo.duration) water.flood.disable();

        if (frames - errorAlert.shownAt >= errorAlert.duration && errorAlert.visible) errorAlert.visible = false;

        if (errorAlert.visible) errorAlert.y = Math.min(50, errorAlert.y + errorAlert.vy);
        else errorAlert.y = Math.max(-100, errorAlert.y - errorAlert.vy);

        document.body.style.cursor = (hoverings.button > 0) ? "pointer" : (hoverings.input > 0) ? "text" : "default";
    };

    const draw = () => {
        c.clear();
        c.draw.fill.rect(theme.getBackgroundColor(), 0, 0, c.width(), c.height());
        if (theme.current === "sunset") {
            c.options.setShadow("yellow", 64);
            c.draw.fill.circle("yellow", c.width(0.5), c.height() - 100, c.width(0.2));
            c.options.setShadow();
        } else if (theme.current === "night") c.draw.fill.rect(c.options.pattern(image.stars), 0, 0, c.width(), c.height());
        else if (theme.current === "synthwave") {
            c.options.setOpacity(0.1);
            c.draw.fill.rect(c.options.pattern(image.stars), 0, 0, c.width(), c.height());
            c.options.setOpacity(1);
            c.draw.fill.rect(c.options.gradient(0, c.height(0.3), 0, c.height(), {pos: 0, color: "transparent"}, {pos: 1, color: "#d51ec4"}), 0, 0, c.width(), c.height());
            c.draw.fill.circle(c.options.gradient(0, c.height() - 600, 0, c.height(), {pos: 0, color: "yellow"}, {pos: 1, color: "#ff1f82"}), c.width(0.5), c.height() - 169, c.width(0.2));
        }

        for (const sprite of MenuSprite.items) {
            if (sprite.visible) c.draw.croppedImage(image.sprites, sprite.color * 128, sprite.facing * 128, 128, 128, sprite.x, sprite.y, 96, 96);
        }

        water.imageX = 0;
        if (!water.flood.enabling && !water.flood.disabling) {
            while (water.imageX < c.width()) {
                c.draw.image(image.water, water.x + water.imageX, water.flood.level - image.water.height);
                water.imageX += image.water.width;
            }
        }

        if (state.current === state.MAIN_MENU) {
            if (theme.isDark()) c.options.filter.add("brightness(100)");
            c.draw.image(image.logo, c.width(0.5) - image.logo.width / 2 + state.change.x, 25, image.logo.width, image.logo.height);
            c.options.filter.remove("brightness");
        } else if (state.current === state.LOCAL_GAME_MENU) {
            c.draw.text({text: "LOCAL MODE", x: c.width(0.5) + state.change.x, y: 80, font: {size: 58, style: "bold"}});
        } else if (state.current === state.LAN_GAME_MENU) {
            c.draw.text({text: "LAN MODE", x: c.width(0.5) + state.change.x, y: 80, font: {size: 58, style: "bold"}});

            c.draw.text({text: "...or join a game on this network:", x: c.width(0.5) + state.change.x, y: c.height(0.5) - 50, font: {size: 32, style: "bold"}});
            c.draw.text({text: "IP address:", x: c.width(0.5) - 230 + state.change.x, y: c.height(0.5) + 60, font: {size: 24}, alignment: "left"});
            c.options.setOpacity(connectionMessage.a);
            c.draw.text({text: connectionMessage.text, x: c.width(0.5) + state.change.x, y: c.height(0.5) + Button.height + 180, color: connectionMessage.color ?? theme.getTextColor(), font: {size: 30, style: "bold"}});
            c.options.setOpacity(1);
            for (let i=0; i<3; i++)
                c.draw.text({text: ".", x: c.width(0.5) - 125 + state.change.x + i * 120, y: c.height(0.5) + 120, font: {size: 40}, alignment: "left"});
        } else if (state.current === state.SETTINGS) {
            c.draw.text({text: "SETTINGS", x: c.width(0.5) + state.change.x, y: 80, font: {size: 58, style: "bold"}});

            c.draw.text({text: "APPEARANCE", x: c.width(0.2) + state.change.x, y: 180, font: {size: 32, style: "bold"}});
            c.draw.text({text: "GRAPHICS", x: c.width(0.5) + state.change.x, y: 180, font: {size: 32, style: "bold"}});
            c.draw.text({text: "CONTROLS", x: c.width(0.8) + state.change.x, y: 180, font: {size: 32, style: "bold"}});

            c.draw.text({text: "Player name:", x: c.width(0.2) - Button.width / 2 - 25 + state.change.x, y: 250, font: {size: 24}, alignment: "left"});
            c.draw.text({text: "Preferred color:", x: c.width(0.2) - Button.width / 2 - 25 + state.change.x, y: 345, font: {size: 24}, alignment: "left"});
            c.draw.text({text: "Superpower:", x: c.width(0.2) - Button.width / 2 - 25 + state.change.x, y: 525, font: {size: 24}, alignment: "left"});
            
            const colors = ["Yellow", "Green", "Red", "Blue", "Orange", "Cyan", "Purple", "Gray"];
            const superpowers = ["Squash", "Shield", "Poop Bomb", "Invisibility", "Power Rockets", "Regeneration", "Knockback", "Strength"];
            c.draw.croppedImage(image.sprites, config.appearance.preferredColor * 128, 0, 128, 128, c.width(0.2) - 80 + state.change.x, 360, 64, 64);
            c.draw.text({text: colors[config.appearance.preferredColor], x: c.width(0.2) + state.change.x, y: 396, font: {size: 28, style: "bold"}, alignment: "left", baseline: "middle"}); 
            c.draw.text({text: superpowers[config.appearance.superpower], x: c.width(0.2) + state.change.x, y: 576, font: {size: 28, style: "bold"}, alignment: "left", baseline: "middle"}); 

            const keybinds = ["Move left", "Move right", "Jump", "Attack", "Launch rocket", "Activate superpower", "Game menu"];
            for (let i=0; i<keybinds.length; i++)
                c.draw.text({text: keybinds[i], x: c.width(0.8) - Button.width / 2 - 25 + state.change.x, y: 250 + i * 60, font: {size: 24}, alignment: "left"});
        } else if (state.current === state.ABOUT) {
            if (theme.isDark()) c.options.filter.add("brightness(100)");
            c.draw.image(image.logo, c.width(0.5) - image.logo.width / 2 + state.change.x, 25, image.logo.width, image.logo.height);
            c.options.filter.remove("brightness");

            c.draw.text({text: "by", x: c.width(0.5) + state.change.x, y: c.height(0.4) - 10, font: {size: 24, style: "bold"}, alignment: "bottom"});
            c.draw.image(image.logo_nmgames, c.width(0.5) - image.logo_nmgames.width / 4 + state.change.x, c.height(0.4), image.logo_nmgames.width / 2, image.logo_nmgames.height / 2);
            c.draw.text({text: `Version ${versions.game}`, x: c.width(0.5) + state.change.x, y: c.height(0.5) + 70, font: {size: 36, style: "bold"}, baseline: "bottom"});
            c.draw.text({text: `(Electron: ${versions.electron}, Chromium: ${versions.chromium})`, x: c.width(0.5) + state.change.x, y: c.height(0.5) + 100, font: {size: 24}, baseline: "bottom"});
            c.draw.text({text: `This program is free and open-source software: you are free to modify and/or redistribute it.`, x: c.width(0.5) + state.change.x, y: c.height(0.7), font: {size: 20}, baseline: "bottom"});
            c.draw.text({text: `There is NO WARRANTY, to the extent permitted by law.`, x: c.width(0.5) + state.change.x, y: c.height(0.7) + 25, font: {size: 20}, baseline: "bottom"});
            c.draw.text({text: `Read the GNU General Public License version 3 for further details.`, x: c.width(0.5) + state.change.x, y: c.height(0.7) + 50, font: {size: 20}, baseline: "bottom"});
        } else if ([state.WAITING_LAN_GUEST, state.WAITING_LAN_HOST].includes(state.current) && game) {
            const ips = network.getIPs();
            const mainIP = ips.shift();

            c.draw.text({
                text: (state.current === state.WAITING_LAN_GUEST) ? "Waiting until start..." : mainIP,
                x: c.width(0.5) + state.change.x,
                y: c.height(0.125),
                font: {size: 58, style: "bold"}
            });
            if (state.current === state.WAITING_LAN_HOST) {
                c.draw.text({text: "Players can now connect to this IP address:", x: c.width(0.5) + state.change.x, y: c.height(0.125) - 60, font: {size: 24}});
                if (ips.length > 0) c.draw.text({text: `If that does not work, try:   ${ips.join("   ")}`, x: c.width(0.5) + state.change.x, y: c.height(0.125) + 30, font: {size: 18}});
            }

            for (let i=0; i<8; i++) {
                const x = (i % 2 === 0) ? c.width(0.5) - 510 : c.width(0.5) + 10;
                const y = Math.floor(i / 2);
                
                if (game.players[i] === null) c.options.setOpacity(0.5);
                c.draw.fill.rect(theme.colors.players[`p${i + 1}`], x + state.change.x, c.height(0.2) + y * 100, 500, 80, 8);
                c.draw.croppedImage(image.sprites, i * 128, 0, 128, 128, x + 8 + state.change.x, c.height(0.2) + y * 100 + 8, 64, 64);
                if (game.players[i] !== null)
                    c.draw.text({text: game.players[i].name, x: x + state.change.x + 85, y: c.height(0.2) + y * 100 + 52, font: {size: 32}, color: theme.colors.text.light, alignment: "left"});
                c.options.setOpacity(1);
            }
        }

        for (const button of Button.items) {
            if (button.state !== state.current) continue;

            c.draw.button(button, state.change.x);
        }
        for (const input of Input.items) {
            if (input.state !== state.current) continue;

            c.draw.input(input, state.change.x, Input.keybindsInvalid, (frames % 40 < 20 && !input.keybind));
        }

        if (water.flood.enabling || water.flood.disabling) {
            while (water.imageX < c.width()) {
                c.draw.image(image.water, water.x + water.imageX, water.flood.level - image.water.height);
                water.imageX += image.water.width;
            }
        }
        c.draw.image(image.water, water.x + water.imageX, water.flood.level - image.water.height);
        c.draw.fill.rect(
            c.options.gradient(0, water.flood.level, 0, water.flood.level + c.height(),
                {pos: 0, color: theme.colors.ui.secondary}, {pos: 0.5, color: theme.colors.ui.primary}, {pos: 1, color: theme.colors.ui.secondary}),
            0,
            water.flood.level - 2,
            c.width(),
            c.height() + 2
        );
        if (introLogo.progress < introLogo.duration) {
            c.options.setOpacity(introLogo.a);
            c.draw.image(
                image.logo_nmgames,
                (c.width() - image.logo_nmgames.width) / 2 - introLogo.movement / 2,
                (c.height() - image.logo_nmgames.height) / 2 - introLogo.movement * (image.logo_nmgames.height / image.logo_nmgames.width) / 2,
                image.logo_nmgames.width + introLogo.movement,
                image.logo_nmgames.height + introLogo.movement * (image.logo_nmgames.height / image.logo_nmgames.width)
            );
            c.options.setOpacity(1);
        }

        const alertWidth = c.draw.text({text: errorAlert.text, x: 80, y: errorAlert.y + 25, color: theme.colors.text.light, font: {size: 32}, alignment: "left", measure: true}) + 30;
        c.options.setShadow(theme.colors.error.foreground, 16);
        c.draw.fill.rect(theme.colors.error.background, (c.width() - alertWidth) / 2, errorAlert.y, alertWidth, 50, 12);
        c.options.setShadow();
        c.draw.text({text: errorAlert.text, x: c.width(0.5), y: errorAlert.y + 35, color: theme.colors.text.light, font: {size: 32}});
        
        if (dialog.visible) {
            c.draw.fill.rect(theme.colors.overlay, 0, 0, c.width(), c.height());
            c.draw.text({text: dialog.header, x: c.width(0.5), y: c.height(0.42), color: theme.colors.text.light, font: {size: 64, style: "bold"}});
            c.draw.text({text: dialog.text, x: c.width(0.5), y: c.height(0.5), color: theme.colors.text.light, font: {size: 32}});

            for (const button of Button.dialogItems) c.draw.button(button, 0);
        }
    };
    
    const loop = () => {
        update();
        draw();

        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
});
