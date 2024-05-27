/** @callback EmptyCallback */

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
const Game = require("../class/game/Game");
const Player = require("../class/game/Player");


const state = {
    MAIN_MENU: 0,
    LOCAL_GAME_MENU: 1,
    LAN_GAME_MENU: 2,
    WAITING_FREEPLAY: 3,
    WAITING_LOCAL: 4,
    WAITING_LAN_HOST: 5,
    WAITING_LAN_GUEST: 6,
    PLAYING_FREEPLAY: 7,
    PLAYING_LOCAL: 8,
    PLAYING_LAN: 9,
    SETTINGS: 10,
    ABOUT: 11,

    current: 0,
    change: {
        /**
         * Change the current game state.
         * @param {number} toState
         * @param {boolean} inverted
         * @param {EmptyCallback} onchanged
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
 * Get the buttons which can be hovered on, depending on visible overlays.
 * @returns {Button[]}
 */
const getHoverableButtons = () => {
    if (dialog.visible) return Button.dialogItems;
    else if (gameMenu.visible) return Button.gameMenuItems;
    else return Button.items;
};

/**
 * Connect to a game.
 * @param {boolean} asHost
 */
const connect = (asHost) => {
    socket.open({
        ip: (asHost) ? "127.0.0.1" : getEnteredIP().join("."),
        appearance: config.appearance,
        onopen: (index) => {
            playerIndex = index;
            connectionMessage.show("");
            state.change.to(asHost ? state.WAITING_LAN_HOST : state.WAITING_LAN_GUEST, false, () => setConnectElementsState(false));
        },
        onclose: (e) => {
            if (state.current === state.LAN_GAME_MENU && e.reason) {
                connectionMessage.show(e.reason, theme.colors.error.foreground, 3);
                setConnectElementsState(false);
            } else {
                if (state.current === state.PLAYING_LAN) water.flood.enable(true);
                const reason = (e.reason) ? e.reason : "You have been disconnected because the game you were in was closed.";
                state.change.to(state.LAN_GAME_MENU, true, () => {
                    water.flood.disable();
                    errorAlert.show(reason);
                    theme.current = config.graphics.theme;
                });
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

const keyChange = () => (JSON.stringify(keys) !== JSON.stringify(lastKeys));

/** @type {import("./settings").Settings} */
const config = {appearance: {}, graphics: {}, controls: {}};
const versions = {game: "", electron: "", chromium: ""};
const keys = {
    moveLeft: false,
    moveRight: false,
    jump: false,
    attack: false,
    launchRocket: false,
    activateSuperpower: false,
    gameMenu: false
};
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
        onfinishedenabling: () => {},
        onfinisheddisabling: () => {},
        /**
         * Enable flooding.
         * @param {boolean} boost 
         * @param {EmptyCallback} onfinished 
         */
        enable: function(boost = false, onfinished = () => {}) {
            if (this.enabling) return;
            
            this.enabled = true;
            this.disabling = false;
            this.enabling = true;
            this.onfinishedenabling = onfinished;
            this.levelSpeed = Number(boost) * c.height() / 10;
        },
        /**
         * Disable flooding.
         * @param {EmptyCallback} onfinished
         */
        disable: function(onfinished = () => {}) {
            if (this.disabling) return;
            
            this.enabled = false;
            this.disabling = true;
            this.onfinisheddisabling = onfinished;
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
const countdown = {
    size: 330,
    defaultSize: 330,
    v: 80,
    a: 1,
    text: "",
    color: "",
    /**
     * Show a countdown announcement.
     * @param {string} text
     * @param {string} color
     */
    show: (text, color) => {
        countdown.text = text;
        countdown.color = color;
        countdown.size = countdown.defaultSize * 3;
        countdown.a = 0;
    }
};
const gameMenu = {
    visible: false,
    x: 0,
    vx: 20,
    width: 420,
    darkness: 0,
    holdingKey: false,
    /** Toggle the game menu visibility state. */
    toggle: () => {
        if (
            ![state.PLAYING_FREEPLAY, state.PLAYING_LAN, state.PLAYING_LOCAL].includes(state.current)
            || water.flood.enabling
            || (game && game.startState < 6)
        ) return;
        gameMenu.visible = !gameMenu.visible;
    },
    /**
     * Set the game menu visibility state.
     * @param {boolean} to
     */
    set: (to) => {
        if (
            ![state.PLAYING_FREEPLAY, state.PLAYING_LAN, state.PLAYING_LOCAL].includes(state.current)
            || water.flood.enabling
            || (game && game.startState < 6)
        ) return;
        gameMenu.visible = to;
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
/** @type {Game} */
let instance;
let isInGame = false;
let lastStartState = 0;
let playerIndex = -1;
let banButton = {
    hoverIndex: -1,
    active: false
};
let lastKeys = JSON.parse(JSON.stringify(keys));
let parallellogram = {
    visible: false,
    moving: false,
    offset: 119,
    y: 1e8,
    vy: 10,
    show: () => {
        if (parallellogram.visible) return;
        parallellogram.visible = true;
        parallellogram.moving = true;
    },
    hide: () => {
        if (!parallellogram.visible) return;
        parallellogram.visible = false;
        parallellogram.moving = true;
    }
};

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
        text: "Freeplay mode",
        state: state.MAIN_MENU,
        x: () => c.width(3/4),
        y: () => c.height(1/2) - 50,
        onclick: function() {
            instance = new Game(true);
            instance.theme = config.graphics.theme;
            instance.players[config.appearance.preferredColor] = new Player(config.appearance, config.appearance.preferredColor);
            instance.addDummies();
            instance.hostIndex = playerIndex = config.appearance.preferredColor;
            Button.getButtonById("FreeplayGameTheme").text = `Theme: ${instance.theme}`;

            this.hovering = false;
            state.change.to(state.WAITING_FREEPLAY, false);
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
        onclick: () => shell.openExternal("https://nm-games.eu")
    }),
    new Button({
        text: "GitHub",
        state: state.ABOUT,
        x: () => c.width(1/2),
        y: () => c.height(9/10) - 25,
        onclick: () => shell.openExternal("https://github.com/NM-Games/super-splash-bros-2")
    }),
    new Button({
        text: "Discord",
        state: state.ABOUT,
        x: () => c.width(1/2) + Button.width + 50,
        y: () => c.height(9/10) - 25,
        onclick: () => shell.openExternal("https://discord.gg/CaMaGRXDqB")
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
                dialog.show(
                    "Are you sure you want to quit?",
                    "Quitting will kick out everyone in your game.",
                        new Button({
                        text: "Yes",
                        x: () => c.width(0.35),
                        y: () => c.height(0.75),
                        danger: true,
                        onclick: () => {
                            dialog.close();
                            ipcRenderer.send("stop-gameserver");
                        }
                    }), new Button({
                        text: "No",
                        x: () => c.width(0.65),
                        y: () => c.height(0.75),
                        onclick: () => dialog.close()
                    })
                );
            } else ipcRenderer.send("stop-gameserver");
        }
    }),
    new Button({
        text: "Theme",
        state: state.WAITING_LAN_HOST,
        x: () => c.width(1/2) - 250,
        y: () => c.height(17/20),
        onclick: () => ipcRenderer.send("lan-cycle-theme")
    }),
    new Button({
        id: "StartLANGame",
        text: "Start!",
        state: state.WAITING_LAN_HOST,
        x: () => c.width(1/2) + 250,
        y: () => c.height(17/20),
        disabled: true,
        onclick: function() {
            this.hovering = false;
            banButton.hoverIndex = -1;
            ipcRenderer.send("start");
        }
    }),
    new Button({
        id: "FreeplayGameTheme",
        text: "Theme",
        state: state.WAITING_FREEPLAY,
        x: () => c.width(1/2) - 250,
        y: () => c.height(17/20),
        onclick: () => {
            instance.theme = theme.cycle(instance.theme)
            theme.current = instance.theme;
            Button.getButtonById("FreeplayGameTheme").text = `Theme: ${instance.theme}`;
        }
    }),
    new Button({
        id: "StartFreeplayGame",
        text: "Start!",
        state: state.WAITING_FREEPLAY,
        x: () => c.width(1/2) + 250,
        y: () => c.height(17/20),
        onclick: function() {
            this.hovering = false;
            banButton.hoverIndex = -1;
            instance.start();
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
    // LAN game waiting menu (freeplay)
    new Button({
        id: `Back-${state.WAITING_FREEPLAY}`,
        text: "◂ Back",
        state: state.WAITING_FREEPLAY,
        x: () => Button.width / 3 + 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.MAIN_MENU, true, () => instance = game = undefined);
            theme.current = config.graphics.theme;
        }
    }),
];
Button.gameMenuItems = [
    new Button({
        text: "Return to game",
        x: () => gameMenu.x - gameMenu.width / 2,
        y: () => 425,
        onclick: function() {
            this.hovering = false;
            gameMenu.set(false);
        }
    }),
    new Button({
        text: "Leave game",
        x: () => gameMenu.x - gameMenu.width / 2,
        y: () => 575,
        danger: true,
        onclick: function() {
            this.hovering = false;
            dialog.show(
                "Are you sure you want to leave?",
                (state.current === state.PLAYING_FREEPLAY) ? ""
                : (playerIndex === game.host) ? "Because you are the host, you will kick everyone out!"
                : "You will not be able to rejoin this game.",
                new Button({
                    text: "Yes",
                    x: () => c.width(0.35),
                    y: () => c.height(0.75),
                    danger: true,
                    onclick: () => {
                        dialog.close();
                        isInGame = false;
                        gameMenu.set(false);
                        water.flood.enable(false, () => {
                            if (state.current === state.PLAYING_LAN) {
                                if (playerIndex === game.host) ipcRenderer.send("stop-gameserver"); else {
                                    socket.close();
                                    errorAlert.suppress();
                                    state.current = state.LAN_GAME_MENU;
                                }
                            } else if (state.current === state.PLAYING_FREEPLAY) {
                                state.current = state.MAIN_MENU;
                            }
                            water.flood.disable();
                        });
                    }
                }), new Button({
                    text: "No",
                    x: () => c.width(0.65),
                    y: () => c.height(0.75),
                    onclick: () => dialog.close()
                })
            );
        }
    })
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
        if ([state.PLAYING_LOCAL, state.PLAYING_LAN, state.PLAYING_FREEPLAY].includes(state.current)
         || (state.current === state.WAITING_LAN_HOST && game.connected > 1)) {
            dialog.show(
                "Are you sure you want to quit?",
                (state.current === state.PLAYING_LAN) ? "You will not be able to rejoin this game."
                : (state.current === state.WAITING_LAN_HOST) ? "Quitting will kick out everyone in your game."
                : "",
                new Button({
                    text: "Yes",
                    x: () => c.width(0.35),
                    y: () => c.height(0.75),
                    danger: true,
                    onclick: () => ipcRenderer.send("quit")
                }), new Button({
                    text: "No",
                    x: () => c.width(0.65),
                    y: () => c.height(0.75),
                    onclick: () => dialog.close()
                })
            );
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
    ipcRenderer.on("gameserver-stopped", () => {
        theme.current = config.graphics.theme;
        state.change.to(state.LAN_GAME_MENU, true);
        errorAlert.suppress();
    });

    addEventListener("keydown", (e) => {
        const button = Button.getButtonById(`Back-${state.current}`);
        if (e.key === "Escape" && button !== null && !button.disabled) button.onclick();
        else if (e.key.toLowerCase() === "v" && e.ctrlKey && Input.getInputById("Username").focused) {
            Input.getInputById("Username").value += clipboard.readText();
            Input.getInputById("Username").value = Input.getInputById("Username").value.slice(0, Input.getInputById("Username").maxLength);
        } else if (e.key === config.controls.gameMenu && !gameMenu.holdingKey && isInGame) {
            gameMenu.holdingKey = true;
            gameMenu.toggle();
        }
        
        if (e.key === konamiEasterEgg.keys[konamiEasterEgg.index]) {
            konamiEasterEgg.index++;
            if (konamiEasterEgg.index >= konamiEasterEgg.keys.length) konamiEasterEgg.activated = true;
        } else konamiEasterEgg.index = 0;

        if (game) {
            for (let i in config.controls) {
                if (e.key === config.controls[i]) {
                    keys[i] = true;
                    break;
                }
            }
            if (keyChange()) {
                if (state.current === state.PLAYING_LAN) socket.sendKeys(keys);
                else if (state.current === state.PLAYING_FREEPLAY) instance.players[instance.hostIndex].setKeys(keys);
            }
            lastKeys = JSON.parse(JSON.stringify(keys));
        }
    });
    addEventListener("keyup", (e) => {
        if (game) {
            for (let i in config.controls) {
                if (e.key === config.controls[i]) {
                    keys[i] = false;
                    break;
                }
            }
            if (keyChange()) {
                if (state.current === state.PLAYING_LAN) socket.sendKeys(keys);
                else if (state.current === state.PLAYING_FREEPLAY) instance.players[instance.hostIndex].setKeys(keys);
            }
            lastKeys = JSON.parse(JSON.stringify(keys));
        }

        if (e.key === config.controls.gameMenu) gameMenu.holdingKey = false; 
    });

    addEventListener("mousemove", (e) => {
        if (dialog.visible || gameMenu.visible) {
            for (const button of getHoverableButtons()) {
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

            if ([state.WAITING_LAN_HOST, state.WAITING_FREEPLAY].includes(state.current) && !water.flood.enabled && game) {
                banButton.hoverIndex = -1;
                for (let i=0; i<8; i++) {
                    const x = (i % 2 === 0) ? c.width(0.5) - 510 : c.width(0.5) + 10;
                    const y = Math.floor(i / 2) * 100 + c.height(0.2) + 8;
                    const w = 500;
                    const h = 80;

                    if (e.clientX > x && e.clientX < x + w && e.clientY > y && e.clientY < y + h && game.players[i] !== null && i !== game.host) {
                        banButton.hoverIndex = i;
                        break;
                    }
                }
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
        for (const button of getHoverableButtons()) {
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
        if (banButton.hoverIndex > -1) banButton.active = true;
    });
    addEventListener("mouseup", (_e) => {
        for (const button of getHoverableButtons()) {
            if (button.active && button.hovering && !button.disabled) {
                button.active = false;
                button.onclick();
                break;
            } else if (button.active) button.active = false;
        }
        if (banButton.hoverIndex > -1 && banButton.active) {
            if (state.current === state.WAITING_LAN_HOST) ipcRenderer.send("ban", banButton.hoverIndex);
            else if (state.current === state.WAITING_FREEPLAY) instance.ban(banButton.hoverIndex);
        }
        banButton.hoverIndex = -1;
        banButton.active = false;
    });

    const update = () => {
        frames++;
        if (socket.isOpen()) game = socket.getGame();
        else if ([state.WAITING_FREEPLAY, state.PLAYING_FREEPLAY].includes(state.current)) {
            instance.update();
            game = instance.export();
        }

        if (game) {
            Button.getButtonById("StartLANGame").disabled = (game.connected < 1);
            Button.getButtonById(`Back-${state.WAITING_LAN_HOST}`).danger = (game.connected > 1);

            if (lastStartState === 0 && game.startState === 1) water.flood.enable();
            else if (lastStartState === 1 && game.startState === 2) {
                state.current = (state.current === state.WAITING_FREEPLAY) ? state.PLAYING_FREEPLAY : state.PLAYING_LAN;
                isInGame = true;
                water.flood.disable();
            } else if (lastStartState === 2 && game.startState === 3) {
                countdown.show("3", theme.colors.countdown._3);
                parallellogram.show();
            } else if (lastStartState === 3 && game.startState === 4) countdown.show("2", theme.colors.countdown._2);
            else if (lastStartState === 4 && game.startState === 5) countdown.show("1", theme.colors.countdown._1);
            else if (lastStartState === 5 && game.startState === 6) countdown.show("GO!", theme.colors.countdown.go);

            lastStartState = game.startState;
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

        countdown.size = Math.max(countdown.defaultSize, countdown.size - countdown.v);
        if (countdown.size > countdown.defaultSize) countdown.a = Math.min(2, countdown.a + 0.2);
        else countdown.a = Math.max(0, countdown.a - 0.03);

        let hoverings = {button: 0, input: 0};
        for (const button of getHoverableButtons()) {
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
                water.flood.onfinishedenabling();
            }
        } else if (water.flood.disabling) {
            water.flood.level += water.flood.levelSpeed;
            water.flood.levelSpeed = Math.max(4, water.flood.levelSpeed / 1.025);
            if (water.flood.level >= c.height()) {
                water.flood.level = c.height();
                water.flood.disabling = false;
                water.flood.onfinisheddisabling();
            }
        } else water.flood.level = (water.flood.enabled) ? 0 : c.height();
        if (frames === introLogo.duration) water.flood.disable();

        if (frames - errorAlert.shownAt >= errorAlert.duration && errorAlert.visible) errorAlert.visible = false;

        if (errorAlert.visible) errorAlert.y = Math.min(50, errorAlert.y + errorAlert.vy);
        else errorAlert.y = Math.max(-100, errorAlert.y - errorAlert.vy);

        if (!isInGame) parallellogram.hide();
        if (parallellogram.visible && parallellogram.moving) {
            parallellogram.y = Math.max(c.height() + 20 - parallellogram.offset, parallellogram.y - parallellogram.vy);
            if (parallellogram.y === c.height() + 20 - parallellogram.offset) parallellogram.moving = false;
        } else if (parallellogram.visible) parallellogram.y = c.height() + 20 - parallellogram.offset;
        else {
            parallellogram.y = Math.min(c.height() + 20, parallellogram.y + parallellogram.vy);
            if (parallellogram.y === c.height() + 20) parallellogram.moving = false;
        }

        if (gameMenu.visible) {
            gameMenu.x = Math.min(gameMenu.width, gameMenu.x + gameMenu.vx);
            gameMenu.darkness = Math.min(0.4, gameMenu.darkness + 0.01);
        } else {
            gameMenu.x = Math.max(0, gameMenu.x - gameMenu.vx);
            gameMenu.darkness = Math.max(0, gameMenu.darkness - 0.01);
        }

        document.body.style.cursor = (hoverings.button > 0 || banButton.hoverIndex > -1) ? "pointer" : (hoverings.input > 0) ? "text" : "default";
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
            c.options.setOpacity();
            c.draw.fill.rect(c.options.gradient(0, c.height(0.3), 0, c.height(), {pos: 0, color: "transparent"}, {pos: 1, color: "#d51ec4"}), 0, 0, c.width(), c.height());
            c.draw.fill.circle(c.options.gradient(0, c.height() - 600, 0, c.height(), {pos: 0, color: "yellow"}, {pos: 1, color: "#ff1f82"}), c.width(0.5), c.height() - 169, c.width(0.2));
        }

        const drawWater = () => {
            water.imageX = 0;
            if (!water.flood.enabling && !water.flood.disabling) {
                while (water.imageX < c.width() + image.water.width) {
                    c.draw.image(image.water, water.x + water.imageX, water.flood.level - image.water.height);
                    water.imageX += image.water.width;
                }
            }    
        };

        if ([state.MAIN_MENU, state.SETTINGS, state.ABOUT, state.LOCAL_GAME_MENU, state.LAN_GAME_MENU, state.WAITING_LAN_GUEST, state.WAITING_LAN_HOST, state.WAITING_FREEPLAY].includes(state.current)) {
            for (const sprite of MenuSprite.items) {
                if (sprite.visible) c.draw.croppedImage(image.sprites, sprite.color * 128, sprite.facing * 128, 128, 128, sprite.x, sprite.y, 96, 96);
            }
            drawWater();
        } else if ([state.PLAYING_LAN, state.PLAYING_FREEPLAY].includes(state.current) && game) {
            const offset = {x: (c.width() - image.platforms.width) / 2, y: c.height() - image.platforms.height};

            c.draw.image(image.platforms, offset.x, offset.y);
            for (const p of game.players) {
                if (p === null) continue;
                
                if (frames % 4 < 2 || game.ping - p.respawn >= p.spawnProtection) c.draw.croppedImage(image.sprites, p.index * 128, Number(p.facing === "l") * 128, 128, 128, p.x + offset.x, p.y + offset.y, p.size, p.size);
                if (playerIndex === p.index) c.draw.fill.triangleUD(theme.colors.ui.indicator, p.x + p.size / 2 + offset.x, p.y + offset.y - 32, 40, 20);

                const offScreen = {
                    x: Math.min(c.width() - p.size - 35, Math.max(25, p.x + offset.x)),
                    y: Math.min(c.height() - p.size - 35, Math.max(25, p.y + offset.y)),
                    triangleX: Math.min(c.width() - p.size - 15, Math.max(5, p.x + offset.x)),
                    triangleY: Math.min(c.height() - p.size - 15, Math.max(5, p.y + offset.y))
                };
                if (p.x + offset.x < -p.size && p.lives > 0) {
                    c.draw.fill.rect(theme.colors.players[p.index], 25, offScreen.y - 10, p.size + 20, p.size + 20, 8);
                    c.draw.fill.triangleLR(theme.colors.players[p.index], 25, offScreen.triangleY + p.size / 2, -20, 30);
                    c.draw.croppedImage(image.sprites, p.index * 128, Number(p.facing === "l") * 128, 128, 128, 35, offScreen.y, p.size, p.size);
                } else if (p.x + offset.x > c.width() && p.lives > 0) {
                    c.draw.fill.rect(theme.colors.players[p.index], c.width() - p.size - 45, offScreen.y - 10, p.size + 20, p.size + 20, 8);
                    c.draw.fill.triangleLR(theme.colors.players[p.index], c.width() - 25, offScreen.triangleY + p.size / 2, 20, 30);
                    c.draw.croppedImage(image.sprites, p.index * 128, Number(p.facing === "l") * 128, 128, 128, c.width() - p.size - 35, offScreen.y, p.size, p.size);
                } else if (p.y + offset.y < -p.size && p.lives > 0) {
                    c.draw.fill.rect(theme.colors.players[p.index], offScreen.x - 10, 25, p.size + 20, p.size + 20, 8);
                    c.draw.fill.triangleUD(theme.colors.players[p.index], offScreen.triangleX + p.size / 2, 25, 30, -20);
                    c.draw.croppedImage(image.sprites, p.index * 128, Number(p.facing === "l") * 128, 128, 128, offScreen.x, 35, p.size, p.size);
                }
            }
            c.options.setShadow(theme.colors.text.dark, 5);
            for (const p of game.players) {
                if (p === null) continue;
                c.draw.text({text: p.name, x: p.x + p.size / 2 + offset.x, y: p.y + offset.y - (playerIndex === p.index ? 42 : 10), font: {size: 20}});
            }

            c.options.setShadow();
            for (const a of game.attacks) {
                c.options.setOpacity(a.a);
                c.draw.fill.circle(theme.colors.players[a.player], a.x + offset.x, a.y + offset.y, a.size);
                c.options.setOpacity(a.a / 2);
                c.draw.stroke.arc(theme.colors.players[a.player], a.x + offset.x, a.y + offset.y, a.border, 15);
            }
            c.options.setOpacity();

            for (const r of game.rockets) {
                c.options.setOpacity(r.trail.a);
                c.draw.line(theme.colors.players[r.player], r.trail.startX + r.width / 2 + offset.x, r.y + offset.y, r.x + r.width / 2 + offset.x, r.y + offset.y, 5);
                c.options.setOpacity();
                if (r.explosion.active) {
                    c.options.setOpacity(r.explosion.a);
                    c.draw.image(image.explosion, r.x - r.explosion.size / 2 + offset.x, r.y - r.explosion.size / 2 + offset.y, r.explosion.size, r.explosion.size);
                    c.options.setOpacity();
                } else c.draw.line(theme.getTextColor(), r.x + offset.x, r.y + offset.y, r.x + r.width + offset.x, r.y + offset.y, 9);
            }
            drawWater();

            for (const s of game.splashes) {
                c.options.setOpacity(s.a);
                c.draw.image(image.splash, s.x - image.splash.width / 2 + offset.x, offset.y + 560);
            }
            c.options.setOpacity();

            const parallellogramWidth = Math.min(350, Math.max(150, (c.width() - 150) / game.startPlayerCount));
            const spacing = (c.width() - game.startPlayerCount * parallellogramWidth) / game.startPlayerCount;
            let i = 0;
            for (const p of game.players) {
                if (p === null) continue;

                const x = spacing / 2 + i * (parallellogramWidth + spacing);
                const y = parallellogram.y;
                const offsets = (parallellogramWidth > 250) ? {
                    sprite: -3,
                    lives: 80,
                    percentage: 82,
                    rockets: 22
                } : {
                    sprite: c.width(-2),
                    lives: 28,
                    percentage: 20,
                    rockets: 22
                };
                const nameSize = Math.min(24, (parallellogramWidth - 150) / 8 + 16);
                c.options.setShadow(theme.colors.text.dark, 6);
                c.draw.fill.parallellogram(theme.colors.players[p.index], x, parallellogram.y, parallellogramWidth, 95);
                c.draw.croppedImage(image.sprites, p.index * 128, 0, 128, 128, x + offsets.sprite, parallellogram.y - 10, 72, 72);
                c.draw.text({text: p.name, x: x + 11, y: parallellogram.y + 85, color: theme.colors.text.light, font: {size: nameSize}, alignment: "left", maxWidth: parallellogramWidth - 35});
                c.draw.text({text: Math.floor(p.hit.percentage), x: x + offsets.percentage, y: parallellogram.y + 64, color: theme.colors.text.light, font: {size: 54, style: "bold"}, alignment: "left", baseline: "bottom"});
                
                const decimalOffset = c.draw.text({text: Math.floor(p.hit.percentage), font: {size: 48, style: "bold"}, measure: true});
                const decimalText = (parallellogramWidth > 250) ? p.hit.percentage.toFixed(1).slice(-2) + "%" : "%";
                c.draw.text({text: decimalText, x: x + decimalOffset + offsets.percentage + 4, y: parallellogram.y + 57, color: theme.colors.text.light, font: {size: 20, style: "bold"}, alignment: "left", baseline: "bottom"});
                c.options.setShadow();
                for (let l=0; l<p.lives; l++) c.draw.croppedImage(image.sprites, p.index * 128, 0, 128, 128, x + offsets.lives + l * 20, y - 19, 16, 16);

                c.draw.image(image.explosion, x + parallellogramWidth - offsets.rockets - 12, y + 5, 24, 24);
                if (frames % 4 < 2 || p.attacks.rocket.count === 0 || game.ping - p.attacks.rocket.lastPerformed >= p.attacks.rocket.cooldown) c.draw.text({
                    text: p.attacks.rocket.count,
                    x: x + parallellogramWidth - offsets.rockets,
                    y: y + 18,
                    color: (p.attacks.rocket.count === 0) ? theme.colors.error.foreground : theme.colors.text.light,
                    font: {size: 18},
                    baseline: "middle"
                });
                c.draw.stroke.arc(theme.colors.text.light, x + parallellogramWidth - offsets.rockets, y + 17, 13, 2, (game.ping - p.attacks.rocket.lastRegenerated) / p.attacks.rocket.regenerationInterval);

                i++;
            }
        } else drawWater();


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
            c.options.setOpacity();
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
        } else if ([state.WAITING_LAN_GUEST, state.WAITING_LAN_HOST, state.WAITING_FREEPLAY].includes(state.current) && game) {
            const ips = network.getIPs();
            const mainIP = ips.shift();
            const text = (state.current === state.WAITING_LAN_GUEST) ? "Waiting until start..." : (state.current === state.WAITING_FREEPLAY) ? "FREEPLAY MODE" : mainIP;

            c.draw.text({text, x: c.width(0.5) + state.change.x, y: c.height(0.125), font: {size: 58, style: "bold"}});
            if (state.current === state.WAITING_LAN_HOST) {
                c.draw.text({text: "Players can now connect to this IP address:", x: c.width(0.5) + state.change.x, y: c.height(0.125) - 60, font: {size: 24}});
                if (ips.length > 0) c.draw.text({text: `If that does not work, try:   ${ips.join("   ")}`, x: c.width(0.5) + state.change.x, y: c.height(0.125) + 30, font: {size: 18}});
            }

            for (let i=0; i<8; i++) {
                const x = (i % 2 === 0) ? c.width(0.5) - 510 : c.width(0.5) + 10;
                const y = Math.floor(i / 2);
                
                if (game.players[i] === null) c.options.setOpacity(0.5);
                c.draw.fill.rect(theme.colors.players[i], x + state.change.x, c.height(0.2) + y * 100, 500, 80, 8);
                c.draw.croppedImage(image.sprites, i * 128, 0, 128, 128, x + 8 + state.change.x, c.height(0.2) + y * 100 + 8, 64, 64);
                if (i === banButton.hoverIndex) c.draw.stroke.rect(theme.colors.error[banButton.active ? "foreground":"background"], x + state.change.x, c.height(0.2) + y * 100, 500, 80, 4, 8);
                if (game.players[i] !== null) {
                    let additionalText = false;
                    if (playerIndex === game.host || state.current === state.WAITING_FREEPLAY) {
                        additionalText = true;
                        const removalVerb = (state.current === state.WAITING_FREEPLAY) ? "remove" : "ban";
                        c.draw.text({text: (i === playerIndex) ? "you":`click to ${removalVerb}`, x: x + state.change.x + 85, y: c.height(0.2) + y * 100 + 65, font: {size: 20}, color: theme.colors.text.light, alignment: "left"})
                    } else if (i === playerIndex) {
                        additionalText = true;
                        c.draw.text({text: "you", x: x + state.change.x + 85, y: c.height(0.2) + y * 100 + 65, font: {size: 20}, color: theme.colors.text.light, alignment: "left"})
                    } else if (i === game.host) {
                        additionalText = true;
                        c.draw.text({text: "host", x: x + state.change.x + 85, y: c.height(0.2) + y * 100 + 65, font: {size: 20}, color: theme.colors.text.light, alignment: "left"})
                    }
                    c.draw.text({text: game.players[i].name, x: x + state.change.x + 85, y: c.height(0.2) + y * 100 + (additionalText ? 39 : 52), font: {size: 32}, color: theme.colors.text.light, alignment: "left"});
                }
                c.options.setOpacity();
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
            while (water.imageX < c.width() + image.water.width) {
                c.draw.image(image.water, water.x + water.imageX, water.flood.level - image.water.height);
                water.imageX += image.water.width;
            }
        }
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
                (c.height() - image.logo_nmgames.height) / 2 - introLogo.movement * image._getAspectRatio(image.logo_nmgames) / 2,
                image.logo_nmgames.width + introLogo.movement,
                image.logo_nmgames.height + introLogo.movement * image._getAspectRatio(image.logo_nmgames)
            );
            c.options.setOpacity();
        }

        if (countdown.a > 0) {
            c.options.setOpacity(countdown.a);
            c.options.setShadow(countdown.color, 16, 1, 1);
            c.draw.text({text: countdown.text, x: c.width(0.5), y: c.height(0.4), font: {size: countdown.size, style: "bold"}, baseline: "middle"});
            c.options.setShadow();
            c.options.setOpacity();
        }

        c.draw.fill.rect(`rgba(0, 0, 0, ${gameMenu.darkness})`, 0, 0, c.width(), c.height());
        if (gameMenu.x > 0) {
            const gameMenuGrd = c.options.gradient(0, 0, 0, c.height(), {pos: 0, color: theme.colors.ui.secondary}, {pos: 1, color: theme.colors.ui.primary});
            const logoY = (gameMenu.width - 40) * image._getAspectRatio(image.logo);
            c.options.filter.add("brightness(0.75)");
            c.draw.fill.rect(gameMenuGrd, 0, 0, gameMenu.x, c.height());
            c.options.filter.add("brightness(200)");
            c.draw.image(image.logo, gameMenu.x - gameMenu.width + 20, 20, gameMenu.width - 40, logoY);
            c.options.filter.remove("brightness");

            c.draw.text({text: "Game menu", x: gameMenu.x - gameMenu.width / 2, y: logoY + 75, color: theme.colors.text.light, font: {size: 50, style: "bold"}});
            for (const button of Button.gameMenuItems) c.draw.button(button, 0);
        }

        const alertWidth = c.draw.text({text: errorAlert.text, font: {size: 32}, measure: true}) + 30;
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
