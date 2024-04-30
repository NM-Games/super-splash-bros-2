const { ipcRenderer, shell } = require("electron");

const c = require("./canvas");
const image = require("./image");
const theme = require("./theme");
const settings = require("./settings");
const { port } = require("../network");
const Button = require("./elements/Button");
const Input = require("./elements/Input");


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
 * @param {boolean} to
 */
const setConnectElementsState = (to) => {
    Button.getButtonById("Connect").hovering =
    Button.getButtonById("CreateGame").hovering =
    Button.getButtonById(`Back-${state.LAN_GAME_MENU}`).hovering =
    Input.getInputById("IP-1").hovering =
    Input.getInputById("IP-2").hovering =
    Input.getInputById("IP-3").hovering =
    Input.getInputById("IP-4").hovering = false;

    Button.getButtonById("Connect").disabled =
    Button.getButtonById("CreateGame").disabled =
    Button.getButtonById(`Back-${state.LAN_GAME_MENU}`).disabled =
    Input.getInputById("IP-1").disabled =
    Input.getInputById("IP-2").disabled =
    Input.getInputById("IP-3").disabled =
    Input.getInputById("IP-4").disabled = to;
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
let wsConnectMessage = {text: "", color: null};
let frames = 0;
let waterX = 0;

Button.items = [
    // Main menu
    new Button({
        text: "Local mode",
        state: state.MAIN_MENU,
        x: {screenFactor: 1/4, offset: 0},
        y: {screenFactor: 1/2, offset: -50},
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
        x: {screenFactor: 1/2, offset: 0},
        y: {screenFactor: 1/2, offset: -50},
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
        x: {screenFactor: 3/4, offset: 0},
        y: {screenFactor: 1/2, offset: -50},
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
        x: {screenFactor: 1/3, offset: 0},
        y: {screenFactor: 3/4, offset: -100},
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
        x: {screenFactor: 2/3, offset: 0},
        y: {screenFactor: 3/4, offset: -100},
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
        x: {screenFactor: 0, offset: Button.width / 3 + 20},
        y: {screenFactor: 0, offset: Button.height / 3 + 20},
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
        x: {screenFactor: 0, offset: Button.width / 3 + 20},
        y: {screenFactor: 0, offset: Button.height / 3 + 20},
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
        x: {screenFactor: 1/2, offset: 0},
        y: {screenFactor: 1/4, offset: 20},
        width: Button.width,
        height: Button.height,
        onclick: function() {
            ipcRenderer.send("start-gameserver");
            ipcRenderer.on("gameserver-created", () => {
                ws = new WebSocket(`ws://127.0.0.1:${port}`);
                ws.addEventListener("open", () => {
                    state.change(state.WAITING_LAN_HOST, false);
                });
            });
        }
    }),
    new Button({
        id: "Connect",
        text: "Connect",
        state: state.LAN_GAME_MENU,
        x: {screenFactor: 1/2, offset: 0},
        y: {screenFactor: 1/2, offset: Button.height + 100},
        width: Button.width,
        height: Button.height,
        onclick: function() {
            const ip = [
                Input.getInputById("IP-1").value,
                Input.getInputById("IP-2").value,
                Input.getInputById("IP-3").value,
                Input.getInputById("IP-4").value
            ];
            let error = 0;
            for (let i=0; i<ip.length; i++) {
                ip[i] = parseInt(ip[i]);
                if (isNaN(ip[i]) || ip[i] < 0 || ip[i] >= 255) error++;
            }

            if (error > 0) {
                wsConnectMessage.text = "Invalid IP address!";
                wsConnectMessage.color = "#e00";
            } else {
                setConnectElementsState(true);
                wsConnectMessage.text = "Connecting...";
                wsConnectMessage.color = null;

                ws = new WebSocket(`ws://${ip.join(".")}:${port}`);
                const connectionTimeout = setTimeout(() => {
                    setConnectElementsState(false);
                    wsConnectMessage.text = "Connection timed out!";
                    wsConnectMessage.color = "#e00";
                    ws = undefined;
                }, 10000);

                ws.addEventListener("open", (e) => {
                    clearTimeout(connectionTimeout);
                    state.change(state.WAITING_LAN_GUEST, false);
                    setConnectElementsState(false);
                });
                ws.addEventListener("error", (err) => {
                    clearTimeout(connectionTimeout);
                    wsConnectMessage.text = "Connection error!";
                    wsConnectMessage.color = "#e00";
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
        x: {screenFactor: 0, offset: Button.width / 3 + 20},
        y: {screenFactor: 0, offset: Button.height / 3 + 20},
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
        x: {screenFactor: 1, offset: -Button.width / 3 - 20},
        y: {screenFactor: 0, offset: Button.height / 3 + 20},
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
        x: {screenFactor: 1/5, offset: -Button.width / 4 - 20},
        y: {screenFactor: 0, offset: 470},
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
        x: {screenFactor: 1/5, offset: Button.width / 4 + 20},
        y: {screenFactor: 0, offset: 470},
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
        x: {screenFactor: 1/5, offset: -Button.width / 4 - 20},
        y: {screenFactor: 0, offset: 650},
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
        x: {screenFactor: 1/5, offset: Button.width / 4 + 20},
        y: {screenFactor: 0, offset: 650},
        width: Button.width / 2,
        height: Button.height / 2,
        onclick: () => {
            if (config.appearance.superpower++ >= 7) config.appearance.superpower = 0;
            settings.set(config);
        }
    }),
    new Button({
        id: "Fullscreen",
        text: "Full screen",
        state: state.SETTINGS,
        x: {screenFactor: 1/2, offset: 0},
        y: {screenFactor: 0, offset: 280},
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
        x: {screenFactor: 1/2, offset: 0},
        y: {screenFactor: 0, offset: 380},
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
        x: {screenFactor: 1/2, offset: 0},
        y: {screenFactor: 0, offset: 480},
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
        x: {screenFactor: 0, offset: Button.width / 3 + 20},
        y: {screenFactor: 0, offset: Button.height / 3 + 20},
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
        x: {screenFactor: 1/2, offset: -Button.width - 50},
        y: {screenFactor: 9/10, offset: -25},
        width: Button.width,
        height: Button.height,
        onclick: function() {
            shell.openExternal("https://nm-games.eu");
        }
    }),
    new Button({
        text: "GitHub",
        state: state.ABOUT,
        x: {screenFactor: 1/2, offset: 0},
        y: {screenFactor: 9/10, offset: -25},
        width: Button.width,
        height: Button.height,
        onclick: function() {
            shell.openExternal("https://github.com/NM-Games/super-splash-bros-2");
        }
    }),
    new Button({
        text: "Discord",
        state: state.ABOUT,
        x: {screenFactor: 1/2, offset: Button.width + 50},
        y: {screenFactor: 9/10, offset: -25},
        width: Button.width,
        height: Button.height,
        onclick: function() {
            shell.openExternal("https://discord.gg/CaMaGRXDqB");
        }
    })
];

Input.items = [
    new Input({
        id: "IP-1",
        state: state.LAN_GAME_MENU,
        x: {screenFactor: 1/2, offset: -180},
        y: {screenFactor: 1/2, offset: 100},
        width: 100,
        maxLength: 3,
        numbersOnly: true,
        onmaxlengthreached: function() {
            this.focused = false;
            setTimeout(() => Input.getInputById("IP-2").focused = true, 10);
        },
        ontab: function(shift) {
            if (!shift) this.onmaxlengthreached();
        }
    }),
    new Input({
        id: "IP-2",
        state: state.LAN_GAME_MENU,
        x: {screenFactor: 1/2, offset: -60},
        y: {screenFactor: 1/2, offset: 100},
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
        }
    }),
    new Input({
        id: "IP-3",
        state: state.LAN_GAME_MENU,
        x: {screenFactor: 1/2, offset: 60},
        y: {screenFactor: 1/2, offset: 100},
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
        }
    }),
    new Input({
        id: "IP-4",
        state: state.LAN_GAME_MENU,
        x: {screenFactor: 1/2, offset: 180},
        y: {screenFactor: 1/2, offset: 100},
        width: 100,
        maxLength: 3,
        numbersOnly: true,
        onemptybackspace: function() {
            this.focused = false;
            Input.getInputById("IP-3").focused = true;   
        },
        ontab: function(shift) {
            if (shift) this.onemptybackspace();
        }
    }),
    new Input({
        id: "Username",
        state: state.SETTINGS,
        x: {screenFactor: 1/5, offset: 0},
        y: {screenFactor: 0, offset: 285},
        width: Button.width + 50,
        size: 25,
        onblur: function() {
            if (this.value.trim().length === 0) this.value = settings.generatePlayerName();
            config.appearance.playerName = this.value;
            settings.set(config);
        }
    }),
    new Input({
        id: "Keybind-MoveLeft",
        state: state.SETTINGS,
        x: {screenFactor: 4/5, offset: 150},
        y: {screenFactor: 0, offset: 240},
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
        x: {screenFactor: 4/5, offset: 150},
        y: {screenFactor: 0, offset: 300},
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
        x: {screenFactor: 4/5, offset: 150},
        y: {screenFactor: 0, offset: 360},
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
        x: {screenFactor: 4/5, offset: 150},
        y: {screenFactor: 0, offset: 420},
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
        x: {screenFactor: 4/5, offset: 150},
        y: {screenFactor: 0, offset: 480},
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
        x: {screenFactor: 4/5, offset: 150},
        y: {screenFactor: 0, offset: 540},
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
        x: {screenFactor: 4/5, offset: 150},
        y: {screenFactor: 0, offset: 600},
        width: 100,
        keybind: true,
        onkeybindselected: (key) => {
            config.controls.gameMenu = key;
            settings.set(config);
        }
    }),
];

addEventListener("DOMContentLoaded", () => {
    c.init();

    settings.init();
    const configFile = settings.get();
    config.appearance = configFile.appearance ?? settings.template.appearance;
    config.graphics = configFile.graphics ?? settings.template.graphics;
    config.controls = configFile.controls ?? settings.template.controls;

    Input.getInputById("Username").value = config.appearance.playerName;

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

    addEventListener("mousemove", (e) => {
        for (const button of Button.items) {
            if (button.state !== state.current) {
                button.hovering = false;
                continue;
            }

            button.hovering = (e.clientX > button.getX() - button.width / 2 && e.clientX < button.getX() + button.width / 2
             && e.clientY > button.getY() - button.height / 2 && e.clientY < button.getY() + button.height / 2 && !button.disabled && !state.changing);
        }
        for (const input of Input.items) {
            if (input.state !== state.current) {
                input.hovering = false;
                continue;
            }

            input.hovering = (e.clientX > input.getX() - input.width / 2 && e.clientX < input.getX() + input.width / 2
             && e.clientY > input.getY() - input.getH(0.5) && e.clientY < input.getY() + input.getH(0.5) && !input.disabled && !state.changing);
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
            if (button.active && button.hovering) {
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

        waterX -= Number(config.graphics.waterFlow);
        if (waterX < -image.water.width) waterX = 0;

        document.body.style.cursor = (hoverings.button > 0) ? "pointer" : (hoverings.input > 0) ? "text" : "default";
    };

    const draw = () => {
        c.clear();
        c.draw.fill.rect(theme.getBackgroundColor().primary, 0, 0, c.width(), c.height());

        for (const sprite of backgroundSprites) {
            if (sprite.visible) c.draw.croppedImage(image.sprites, sprite.type * 128, sprite.facing * 128, 128, 128, sprite.x, sprite.y, 96, 96);
        }

        let watersX = 0;
        while (watersX < c.width()) {
            c.draw.image(image.water, waterX + watersX, c.height() - 100);
            watersX += image.water.width;
        }
        c.draw.image(image.water, waterX + watersX, c.height() - 100);

        if (state.current === state.MAIN_MENU) c.draw.image(image.logo, c.width(0.5) - image.logo.width / 2 + state.changeX, 25, image.logo.width, image.logo.height);
        else if (state.current === state.LOCAL_GAME_MENU) {
            c.draw.text("LOCAL MODE", c.width(0.5) + state.changeX, 80, theme.getTextColor(), 58, "Shantell Sans", "bold", "center");
        } else if (state.current === state.LAN_GAME_MENU) {
            c.draw.text("LAN MODE", c.width(0.5) + state.changeX, 80, theme.getTextColor(), 58, "Shantell Sans", "bold", "center");
            c.draw.text("...or join a game on this network:", c.width(0.5) + state.changeX, c.height(0.5) - 50, theme.getTextColor(), 32, "Shantell Sans", "bold", "center");
            c.draw.text("IP address:", c.width(0.5) - 230 + state.changeX, c.height(0.5) + 60, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            c.draw.text(wsConnectMessage.text, c.width(0.5) + state.changeX, c.height(0.5) + Button.height + 180, wsConnectMessage.color ?? theme.getTextColor(), 30, "Shantell Sans", "bold", "center");
        } else if (state.current === state.SETTINGS) {
            c.draw.text("SETTINGS", c.width(0.5) + state.changeX, 80, theme.getTextColor(), 58, "Shantell Sans", "bold", "center");

            c.draw.text("APPEARANCE", c.width(0.2) + state.changeX, 180, theme.getTextColor(), 32, "Shantell Sans", "bold", "center");
            c.draw.text("GRAPHICS", c.width(0.5) + state.changeX, 180, theme.getTextColor(), 32, "Shantell Sans", "bold", "center");
            c.draw.text("CONTROLS", c.width(0.8) + state.changeX, 180, theme.getTextColor(), 32, "Shantell Sans", "bold", "center");

            c.draw.text("Player name:", c.width(0.2) - Button.width / 2 - 25 + state.changeX, 250, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            c.draw.text("Preferred color:", c.width(0.2) - Button.width / 2 - 25 + state.changeX, 345, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            c.draw.text("Superpower:", c.width(0.2) - Button.width / 2 - 25 + state.changeX, 525, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            
            const colors = ["Yellow", "Green", "Red", "Blue", "Orange", "Cyan", "Purple", "Gray"];
            const superpowers = ["Squash", "Shield", "Poop Bomb", "Invisibility", "Power Rockets", "Regeneration", "Knockback", "Strength"];
            c.draw.croppedImage(image.sprites, config.appearance.preferredColor * 128, 0, 128, 128, c.width(0.2) - 80 + state.changeX, 360, 64, 64);
            c.draw.text(colors[config.appearance.preferredColor], c.width(0.2) + state.changeX, 396, theme.getTextColor(), 28, "Shantell Sans", "bold", "left", "middle"); 
            c.draw.text(superpowers[config.appearance.superpower], c.width(0.2), 576 + state.changeX, theme.getTextColor(), 28, "Shantell Sans", "bold", "left", "middle"); 

            const keybinds = ["Move left", "Move right", "Jump", "Attack", "Launch rocket", "Activate superpower", "Game menu"];
            for (let i=0; i<keybinds.length; i++)
                c.draw.text(keybinds[i], c.width(0.8) - Button.width / 2 - 25 + state.changeX, 250 + i * 60, theme.getTextColor(), 24, "Shantell Sans", "", "left");
        } else if (state.current === state.ABOUT) {
            c.draw.image(image.logo, c.width(0.5) - image.logo.width / 2 + state.changeX, 25, image.logo.width, image.logo.height);
            c.draw.text("by", c.width(0.5) + state.changeX, c.height(0.4) - 10, theme.getTextColor(), 24, "Shantell Sans", "bold", "center", "bottom");
            c.draw.image(image.logo_nmgames, c.width(0.5) - image.logo_nmgames.width / 4 + state.changeX, c.height(0.4), image.logo_nmgames.width / 2, image.logo_nmgames.height / 2);
            c.draw.text(`Version ${versions.game}`, c.width(0.5) + state.changeX, c.height(0.5) + 70, theme.getTextColor(), 36, "Shantell Sans", "bold", "center", "bottom");
            c.draw.text(`(Electron: ${versions.electron}, Chromium: ${versions.chromium})`, c.width(0.5) + state.changeX, c.height(0.5) + 100, theme.getTextColor(), 24, "Shantell Sans", "", "center", "bottom");
            c.draw.text(`This program is free and open-source software: you can modify and/or redistribute it`, c.width(0.5) + state.changeX, c.height(0.7), theme.getTextColor(), 20, "Shantell Sans", "", "center", "bottom");
            c.draw.text(`under the terms of the GNU General Public License as published by the Free Software Foundation,`, c.width(0.5) + state.changeX, c.height(0.7) + 25, theme.getTextColor(), 20, "Shantell Sans", "", "center", "bottom");
            c.draw.text(`either version 3 of the License, or (at your option) any later version.`, c.width(0.5) + state.changeX, c.height(0.7) + 50, theme.getTextColor(), 20, "Shantell Sans", "", "center", "bottom");

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
