const { ipcRenderer, clipboard, shell } = require("electron");

const c = require("./canvas");
const image = require("./image");
const theme = require("./theme");
const settings = require("./settings");
const network = require("../network");
const Button = require("../class/ui/Button");
const Input = require("../class/ui/Input");


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
    changing: false,
    changingTo: 0,
    changeX: 0,
    changeVX: 0,
    /**
     * Change the current game state.
     * @param {number} to
     * @param {boolean} inverted
     */
    change: (to, inverted) => {
        state.changingTo = to;
        state.changeVX = (inverted) ? 150 : -150;
        state.changing = true;
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
 * Generate sprites for in menu backgrounds.
 */
const generateBackgroundSprites = () => {
    const sprites = [];
    let spriteX = 50;
    while (spriteX < 20000) {
        sprites.push({
            visible: false,
            x: spriteX,
            y: 900,
            amplitude: Math.random() * 250 + 300,
            offset: Math.floor(Math.random() * 300),
            type: Math.floor(Math.random() * 4),
            facing: Math.round(Math.random())
        });
        spriteX += Math.random() * 100 + 200;
    }
    return sprites;
};

const backgroundSprites = generateBackgroundSprites();
const config = {appearance: {}, graphics: {}, controls: {}};
const versions = {game: "", electron: "", chromium: ""};

/** @type {WebSocket} */
let ws;
let connectionMessage = {
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
let frames = 0;
let waterX = 0;

Button.items = [
    // Main menu
    new Button({
        text: "Local mode",
        state: state.MAIN_MENU,
        x: () => c.width(1/4),
        y: () => c.height(1/2) + -50,
        width: Button.width,
        height: Button.height,
        onclick: function() {
            this.hovering = false;
            state.change(state.LOCAL_GAME_MENU, false);
        }
    }),
    new Button({
        text: "LAN mode",
        state: state.MAIN_MENU,
        x: () => c.width(1/2),
        y: () => c.height(1/2) + -50,
        width: Button.width,
        height: Button.height,
        onclick: function() {
            this.hovering = false;
            state.change(state.LAN_GAME_MENU, false);
        }
    }),
    new Button({
        text: "Practice mode",
        state: state.MAIN_MENU,
        x: () => c.width(3/4),
        y: () => c.height(1/2) + -50,
        width: Button.width,
        height: Button.height,
        onclick: function() {
            this.hovering = false;
            state.change(state.PLAYING_FREEPLAY, false);
        }
    }),
    new Button({
        text: "Settings",
        state: state.MAIN_MENU,
        x: () => c.width(1/3),
        y: () => c.height(3/4) + -100,
        width: Button.width,
        height: Button.height,
        onclick: function() {
            this.hovering = false;
            state.change(state.SETTINGS, false);
        }
    }),
    new Button({
        text: "Quit game",
        state: state.MAIN_MENU,
        x: () => c.width(2/3),
        y: () => c.height(3/4) + -100,
        width: Button.width,
        height: Button.height,
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
        x: () => c.width(0) + Button.width / 3 + 20,
        y: () => c.height(0) + Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change(state.MAIN_MENU, true);
        }
    }),
    // LAN mode menu
    new Button({
        id: `Back-${state.LAN_GAME_MENU}`,
        text: "◂ Back",
        state: state.LAN_GAME_MENU,
        x: () => c.width(0) + Button.width / 3 + 20,
        y: () => c.height(0) + Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change(state.MAIN_MENU, true);
        }
    }),
    new Button({
        id: "CreateGame",
        text: "Create a game",
        state: state.LAN_GAME_MENU,
        x: () => c.width(1/2),
        y: () => c.height(1/4) + 20,
        width: Button.width,
        height: Button.height,
        onclick: function() {
            setConnectElementsState(true);
            ipcRenderer.send("start-gameserver");
            ipcRenderer.on("gameserver-created", () => {
                ws = new WebSocket(`ws://127.0.0.1:${network.port}`);
                ws.addEventListener("open", () => {
                    setConnectElementsState(false);
                    Button.getButtonById("LANGameTheme").text = `Theme: ${theme.current}`;
                    state.change(state.WAITING_LAN_HOST, false);
                });
            });
        }
    }),
    new Button({
        id: "Connect",
        text: "Connect",
        state: state.LAN_GAME_MENU,
        x: () => c.width(1/2),
        y: () => c.height(1/2) + Button.height + 100,
        width: Button.width,
        height: Button.height,
        disabled: true,
        onclick: function() {
            const ip = getEnteredIP();
            if (!network.isValidIP(ip)) connectionMessage.show("Invalid IP address!", theme.colors.ui.error, 3); else {
                setConnectElementsState(true);
                connectionMessage.show("Connecting...");

                ws = new WebSocket(`ws://${ip.join(".")}:${network.port}`);
                const connectionTimeout = setTimeout(() => {
                    setConnectElementsState(false);
                    connectionMessage.show("Connection timed out!", theme.colors.ui.error, 3);
                    ws = undefined;
                }, 10000);

                ws.addEventListener("open", (e) => {
                    clearTimeout(connectionTimeout);
                    state.change(state.WAITING_LAN_GUEST, false);
                    setConnectElementsState(false);
                });
                ws.addEventListener("error", (err) => {
                    clearTimeout(connectionTimeout);
                    connectionMessage.show("Connection error!", theme.colors.ui.error, 3);
                    setConnectElementsState(false);
                });
            }
        }
    }),
    // Settings menu
    new Button({
        id: `Back-${state.SETTINGS}`,
        text: "◂ Back",
        state: state.SETTINGS,
        x: () => c.width(0) + Button.width / 3 + 20,
        y: () => c.height(0) + Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change(state.MAIN_MENU, true);
        }
    }),
    new Button({
        text: "About...",
        state: state.SETTINGS,
        x: () => c.width(1) + -Button.width / 3 - 20,
        y: () => c.height(0) + Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change(state.ABOUT, false);
        }
    }),
    // for the sprite color switch:
    new Button({
        text: "◂ Previous",
        state: state.SETTINGS,
        x: () => c.width(1/5) + -Button.width / 4 - 20,
        y: () => c.height(0) + 470,
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
        y: () => c.height(0) + 470,
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
        x: () => c.width(1/5) + -Button.width / 4 - 20,
        y: () => c.height(0) + 650,
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
        y: () => c.height(0) + 650,
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
        y: () => c.height(0) + 280,
        width: Button.width,
        height: Button.height,
        onclick: function() {
            config.graphics.theme = theme.cycle();
            this.text = `Theme: ${theme.current}`;
            settings.set(config);
        }
    }),
    new Button({
        id: "Fullscreen",
        text: "Full screen",
        state: state.SETTINGS,
        x: () => c.width(1/2),
        y: () => c.height(0) + 380,
        width: Button.width,
        height: Button.height,
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
        y: () => c.height(0) + 480,
        width: Button.width,
        height: Button.height,
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
        y: () => c.height(0) + 580,
        width: Button.width,
        height: Button.height,
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
        x: () => c.width(0) + Button.width / 3 + 20,
        y: () => c.height(0) + Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change(state.SETTINGS, true);
        }
    }),
    new Button({
        text: "Website",
        state: state.ABOUT,
        x: () => c.width(1/2) + -Button.width - 50,
        y: () => c.height(9/10) + -25,
        width: Button.width,
        height: Button.height,
        onclick: function() {
            shell.openExternal("https://nm-games.eu");
        }
    }),
    new Button({
        text: "GitHub",
        state: state.ABOUT,
        x: () => c.width(1/2),
        y: () => c.height(9/10) + -25,
        width: Button.width,
        height: Button.height,
        onclick: function() {
            shell.openExternal("https://github.com/NM-Games/super-splash-bros-2");
        }
    }),
    new Button({
        text: "Discord",
        state: state.ABOUT,
        x: () => c.width(1/2) + Button.width + 50,
        y: () => c.height(9/10) + -25,
        width: Button.width,
        height: Button.height,
        onclick: function() {
            shell.openExternal("https://discord.gg/CaMaGRXDqB");
        }
    }),
    // LAN game waiting menu (host)
    new Button({
        id: `Back-${state.WAITING_LAN_HOST}`,
        text: "◂ Quit",
        state: state.WAITING_LAN_HOST,
        x: () => c.width(0) + Button.width / 3 + 20,
        y: () => c.height(0) + Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            ipcRenderer.send("stop-gameserver");
            ipcRenderer.on("gameserver-stopped", () => {
                this.hovering = false;
                theme.current = config.graphics.theme;
                state.change(state.LAN_GAME_MENU, true);
            });
        }
    }),
    new Button({
        id: "LANGameTheme",
        text: "Theme",
        state: state.WAITING_LAN_HOST,
        x: () => c.width(1/2) + -250,
        y: () => c.height(17/20),
        width: Button.width,
        height: Button.height,
        onclick: function() {
            theme.cycle();
            this.text = `Theme: ${theme.current}`;
        }
    }),
    new Button({
        id: "StartLANGame",
        text: "Start!",
        state: state.WAITING_LAN_HOST,
        x: () => c.width(1/2) + 250,
        y: () => c.height(17/20),
        width: Button.width,
        height: Button.height,
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
        x: () => c.width(0) + Button.width / 3 + 20,
        y: () => c.height(0) + Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            ws.close();
            this.hovering = false;
            state.change(state.LAN_GAME_MENU, true);
        }
    }),
];

Input.items = [
    new Input({
        id: "IP-1",
        state: state.LAN_GAME_MENU,
        x: () => c.width(1/2) + -180,
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
        x: () => c.width(1/2) + -60,
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
        y: () => c.height(0) + 285,
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
        y: () => c.height(0) + 240,
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
        y: () => c.height(0) + 300,
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
        y: () => c.height(0) + 360,
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
        y: () => c.height(0) + 420,
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
        y: () => c.height(0) + 480,
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
        y: () => c.height(0) + 540,
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
        y: () => c.height(0) + 600,
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

    ipcRenderer.on("fullscreen-status", (_e, enabled) => {
        config.graphics.fullScreen = enabled;
        Button.getButtonById("Fullscreen").text = `Full screen: ${enabled ? "ON":"OFF"}`;
        settings.set(config);
    });
    ipcRenderer.on("information", (_e, game, electron, chromium) => {
        versions.game = game;
        versions.electron = electron;
        versions.chromium = chromium;
    });

    addEventListener("keydown", (e) => {
        const button = Button.getButtonById(`Back-${state.current}`);
        if (e.key === "Escape" && button !== null && !button.disabled) button.onclick();
        else if (e.key.toLowerCase() === "v" && e.ctrlKey && Input.getInputById("Username").focused) {
            Input.getInputById("Username").value += clipboard.readText();
            Input.getInputById("Username").value = Input.getInputById("Username").value.slice(0, Input.getInputById("Username").maxLength);
        }
    });

    addEventListener("mousemove", (e) => {
        for (const button of Button.items) {
            if (button.state !== state.current) {
                button.hovering = false;
                continue;
            }

            button.hovering = (e.clientX > button.x() - button.width / 2 && e.clientX < button.x() + button.width / 2
             && e.clientY > button.y() - button.height / 2 && e.clientY < button.y() + button.height / 2 && !button.disabled && !state.changing);
        }
        for (const input of Input.items) {
            if (input.state !== state.current) {
                input.hovering = false;
                continue;
            }

            input.hovering = (e.clientX > input.x() - input.width / 2 && e.clientX < input.x() + input.width / 2
             && e.clientY > input.y() - input.getHeight(0.5) && e.clientY < input.y() + input.getHeight(0.5) && !input.disabled && !state.changing);
        }
    });

    addEventListener("mousedown", (_e) => {
        for (const button of Button.items) {
            if (button.hovering && !state.changing) {
                button.active = true;
                break;
            }
        }
        for (const input of Input.items) {
            const oldFocused = input.focused;
            input.focused = (input.hovering && !state.changing);
            if (oldFocused && !input.focused) input.onblur();
        }
    });
    addEventListener("mouseup", (_e) => {
        for (const button of Button.items) {
            if (button.active && button.hovering && !button.disabled) {
                button.active = false;
                button.onclick();
                break;
            } else if (button.active) button.active = false;
        }
    });

    const update = () => {
        frames++;

        if (state.changing) {
            state.changeX += state.changeVX;
            if (state.changeX < -c.width()) {
                state.current = state.changingTo;
                state.changeX = c.width();
            } else if (state.changeX > c.width()) {
                state.current = state.changingTo;
                state.changeX = -c.width();
            }

            if (state.current === state.changingTo && ((state.changeVX < 0 && state.changeX < 0) || (state.changeVX > 0 && state.changeX > 0))) {
                state.changeX = 0;
                state.changing = false;
            }
        }

        for (const sprite of backgroundSprites) {
            sprite.y = Math.sin((frames + sprite.offset) / 40) * sprite.amplitude + c.height();
            if (sprite.y > c.height()) {
                sprite.visible = config.graphics.menuSprites;
                sprite.type = Math.floor(Math.random() * 4);
                sprite.facing = Math.round(Math.random());
            }
        }

        let hoverings = {button: 0, input: 0};
        for (const button of Button.items) {
            if (button.hovering) hoverings.button++;
        }
        for (const input of Input.items) {
            if (input.hovering) hoverings.input++;
        }

        if (frames - connectionMessage.shownAt >= connectionMessage.duration) connectionMessage.a = Math.max(connectionMessage.a - 0.05, 0);

        waterX -= Number(config.graphics.waterFlow);
        if (waterX < -image.water.width) waterX = 0;

        document.body.style.cursor = (hoverings.button > 0) ? "pointer" : (hoverings.input > 0) ? "text" : "default";
    };

    const draw = () => {
        c.clear();
        c.draw.fill.rect(theme.getBackgroundColor(), 0, 0, c.width(), c.height());
        if (theme.current === "sunset") {
            c.options.setShadow("yellow", 64);
            c.draw.fill.circle("yellow", c.width(0.5), c.height() - 100, c.width(0.2));
            c.options.setShadow();
        } else if (theme.current === "night") c.draw.image(image.stars, 0, 0, c.width(), c.height());
        else if (theme.current === "synthwave") {
            c.options.setOpacity(0.1);
            c.draw.image(image.stars, 0, 0, c.width(), c.height());
            c.options.setOpacity(1);
            c.draw.fill.rect(c.options.gradient(0, c.height(0.3), 0, c.height(), {pos: 0, color: "transparent"}, {pos: 1, color: "#d51ec4"}), 0, 0, c.width(), c.height());
            c.draw.fill.circle(c.options.gradient(0, c.height() - 600, 0, c.height(), {pos: 0, color: "yellow"}, {pos: 1, color: "#ff1f82"}), c.width(0.5), c.height() - 169, c.width(0.2));
        }

        for (const sprite of backgroundSprites) {
            if (sprite.visible) c.draw.croppedImage(image.sprites, sprite.type * 128, sprite.facing * 128, 128, 128, sprite.x, sprite.y, 96, 96);
        }

        let watersX = 0;
        while (watersX < c.width()) {
            c.draw.image(image.water, waterX + watersX, c.height() - 100);
            watersX += image.water.width;
        }
        c.draw.image(image.water, waterX + watersX, c.height() - 100);

        if (state.current === state.MAIN_MENU) {
            if (theme.isDark()) c.options.setFilter("brightness(100)");
            c.draw.image(image.logo, c.width(0.5) - image.logo.width / 2 + state.changeX, 25, image.logo.width, image.logo.height);
            c.options.setFilter();
        } else if (state.current === state.LOCAL_GAME_MENU) {
            c.draw.text({text: "LOCAL MODE", x: c.width(0.5) + state.changeX, y: 80, font: {size: 58, style: "bold"}});
        } else if (state.current === state.LAN_GAME_MENU) {
            c.draw.text({text: "LAN MODE", x: c.width(0.5) + state.changeX, y: 80, font: {size: 58, style: "bold"}});

            c.draw.text({text: "...or join a game on this network:", x: c.width(0.5) + state.changeX, y: c.height(0.5) - 50, font: {size: 32, style: "bold"}});
            c.draw.text({text: "IP address:", x: c.width(0.5) - 230 + state.changeX, y: c.height(0.5) + 60, font: {size: 24}, alignment: "left"});
            c.options.setOpacity(connectionMessage.a);
            c.draw.text({text: connectionMessage.text, x: c.width(0.5) + state.changeX, y: c.height(0.5) + Button.height + 180, color: connectionMessage.color ?? theme.getTextColor(), font: {size: 30, style: "bold"}});
            c.options.setOpacity(1);
            for (let i=0; i<3; i++)
                c.draw.text({text: ".", x: c.width(0.5) - 125 + state.changeX + i * 120, y: c.height(0.5) + 120, font: {size: 40}, alignment: "left"});
        } else if (state.current === state.SETTINGS) {
            c.draw.text({text: "SETTINGS", x: c.width(0.5) + state.changeX, y: 80, font: {size: 58, style: "bold"}});

            c.draw.text({text: "APPEARANCE", x: c.width(0.2) + state.changeX, y: 180, font: {size: 32, style: "bold"}});
            c.draw.text({text: "GRAPHICS", x: c.width(0.5) + state.changeX, y: 180, font: {size: 32, style: "bold"}});
            c.draw.text({text: "CONTROLS", x: c.width(0.8) + state.changeX, y: 180, font: {size: 32, style: "bold"}});

            c.draw.text({text: "Player name:", x: c.width(0.2) - Button.width / 2 - 25 + state.changeX, y: 250, font: {size: 24}, alignment: "left"});
            c.draw.text({text: "Preferred color:", x: c.width(0.2) - Button.width / 2 - 25 + state.changeX, y: 345, font: {size: 24}, alignment: "left"});
            c.draw.text({text: "Superpower:", x: c.width(0.2) - Button.width / 2 - 25 + state.changeX, y: 525, font: {size: 24}, alignment: "left"});
            
            const colors = ["Yellow", "Green", "Red", "Blue", "Orange", "Cyan", "Purple", "Gray"];
            const superpowers = ["Squash", "Shield", "Poop Bomb", "Invisibility", "Power Rockets", "Regeneration", "Knockback", "Strength"];
            c.draw.croppedImage(image.sprites, config.appearance.preferredColor * 128, 0, 128, 128, c.width(0.2) - 80 + state.changeX, 360, 64, 64);
            c.draw.text({text: colors[config.appearance.preferredColor], x: c.width(0.2) + state.changeX, y: 396, font: {size: 28, style: "bold"}, alignment: "left", baseline: "middle"}); 
            c.draw.text({text: superpowers[config.appearance.superpower], x: c.width(0.2) + state.changeX, y: 576, font: {size: 28, style: "bold"}, alignment: "left", baseline: "middle"}); 

            const keybinds = ["Move left", "Move right", "Jump", "Attack", "Launch rocket", "Activate superpower", "Game menu"];
            for (let i=0; i<keybinds.length; i++)
                c.draw.text({text: keybinds[i], x: c.width(0.8) - Button.width / 2 - 25 + state.changeX, y: 250 + i * 60, font: {size: 24}, alignment: "left"});
        } else if (state.current === state.ABOUT) {
            if (theme.isDark()) c.options.setFilter("brightness(100)");
            c.draw.image(image.logo, c.width(0.5) - image.logo.width / 2 + state.changeX, 25, image.logo.width, image.logo.height);
            c.options.setFilter();

            c.draw.text({text: "by", x: c.width(0.5) + state.changeX, y: c.height(0.4) - 10, font: {size: 24, style: "bold"}, alignment: "bottom"});
            c.draw.image(image.logo_nmgames, c.width(0.5) - image.logo_nmgames.width / 4 + state.changeX, c.height(0.4), image.logo_nmgames.width / 2, image.logo_nmgames.height / 2);
            c.draw.text({text: `Version ${versions.game}`, x: c.width(0.5) + state.changeX, y: c.height(0.5) + 70, font: {size: 36, style: "bold"}, baseline: "bottom"});
            c.draw.text({text: `(Electron: ${versions.electron}, Chromium: ${versions.chromium})`, x: c.width(0.5) + state.changeX, y: c.height(0.5) + 100, font: {size: 24}, baseline: "bottom"});
            c.draw.text({text: `This program is free and open-source software: you are free to modify and/or redistribute it.`, x: c.width(0.5) + state.changeX, y: c.height(0.7), font: {size: 20}, baseline: "bottom"});
            c.draw.text({text: `There is NO WARRANTY, to the extent permitted by law.`, x: c.width(0.5) + state.changeX, y: c.height(0.7) + 25, font: {size: 20}, baseline: "bottom"});
            c.draw.text({text: `Read the GNU General Public License version 3 for further details.`, x: c.width(0.5) + state.changeX, y: c.height(0.7) + 50, font: {size: 20}, baseline: "bottom"});
        } else if ([state.WAITING_LAN_GUEST, state.WAITING_LAN_HOST].includes(state.current)) {
            const ips = network.getIPs();
            const mainIP = ips.shift();

            c.draw.text({
                text: (state.current === state.WAITING_LAN_GUEST) ? "Waiting until start..." : mainIP,
                x: c.width(0.5) + state.changeX,
                y: c.height(0.125),
                font: {size: 58, style: "bold"}
            });
            if (state.current === state.WAITING_LAN_HOST) {
                c.draw.text({text: "Players can now connect to this IP address:", x: c.width(0.5) + state.changeX, y: c.height(0.125) - 60, font: {size: 24}});
                if (ips.length > 0) c.draw.text({text: `If that does not work, try:   ${ips.join("   ")}`, x: c.width(0.5) + state.changeX, y: c.height(0.125) + 30, font: {size: 18}});
            }

            for (let i=0; i<8; i++) {
                const x = (i % 2 === 0) ? c.width(0.5) - 510 : c.width(0.5) + 10;
                const y = Math.floor(i / 2);
                c.draw.fill.rect(theme.colors.players[`p${i + 1}`], x + state.changeX, c.height(0.2) + y * 100, 500, 80, 8);
                c.draw.croppedImage(image.sprites, i * 128, 0, 128, 128, x + 8 + state.changeX, c.height(0.2) + y * 100 + 8, 64, 64);
            }
        }

        for (const button of Button.items) {
            if (button.state !== state.current) continue;

            c.draw.button(button, state.changeX);
        }
        for (const input of Input.items) {
            if (input.state !== state.current) continue;

            c.draw.input(input, state.changeX, Input.keybindsInvalid, (frames % 40 < 20 && !input.keybind));
        }
    };
    
    const loop = () => {
        update();
        draw();

        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
});
