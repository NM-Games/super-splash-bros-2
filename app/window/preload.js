const { ipcRenderer } = require("electron");

const c = require("./canvas");
const image = require("./image");
const theme = require("./theme");
const settings = require("./settings");
const Button = require("./elements/Button");
const Input = require("./elements/Input");


const state = {
    MAIN_MENU: 0,
    LOCAL_GAME_MENU: 1,
    LAN_GAME_MENU: 2,
    PLAYING_FREEPLAY: 3,
    PLAYING_LOCAL: 4,
    PLAYING_LAN: 5,
    SETTINGS: 6,
    ABOUT: 7,

    current: 0,
    changing: false,
    changingTo: 0,
    changeX: 0,
    changeVX: 0,
    /**
     * Change the current game state
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
    // Settings menu
    new Button({
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
            // todo: switch superpowers
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
            // todo: switch superpowers
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
            // todo: switch superpowers
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
            // todo: switch superpowers
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
    })    
];

Input.items = [
    new Input({
        id: "IP-1",
        state: state.LAN_GAME_MENU,
        x: {screenFactor: 1/2, offset: -300},
        y: {screenFactor: 1/2, offset: 100},
        width: 175,
        maxLength: 3,
        numbersOnly: true
    }),
    new Input({
        id: "Username",
        state: state.SETTINGS,
        x: {screenFactor: 1/5, offset: 0},
        y: {screenFactor: 0, offset: 285},
        width: Button.width + 50,
        size: 25,
        onblur: function() {
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

    addEventListener("mousemove", (e) => {
        for (const button of Button.items) {
            if (button.state !== state.current) {
                button.hovering = false;
                continue;
            }

            button.hovering = (e.clientX > button.getX() - button.width / 2 && e.clientX < button.getX() + button.width / 2
             && e.clientY > button.getY() - button.height / 2 && e.clientY < button.getY() + button.height / 2 && !state.changing);
        }
        for (const input of Input.items) {
            if (input.state !== state.current) {
                input.hovering = false;
                continue;
            }

            input.hovering = (e.clientX > input.getX() - input.width / 2 && e.clientX < input.getX() + input.width / 2
             && e.clientY > input.getY() - input.getH(0.5) && e.clientY < input.getY() + input.getH(0.5) && !state.changing);
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

        waterX -= Number(config.graphics.waterFlow);
        if (waterX < -image.water.width) waterX = 0;
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

        if ([state.MAIN_MENU, state.ABOUT].includes(state.current)) c.draw.image(image.logo, c.width(0.5) - image.logo.width / 2 + state.changeX, 25, image.logo.width, image.logo.height);
        else if (state.current === state.LOCAL_GAME_MENU) {
            c.draw.text("LOCAL MODE", c.width(0.5) + state.changeX, 80, theme.getTextColor(), 58, "Shantell Sans", "bold", "center");
        } else if (state.current === state.LAN_GAME_MENU) {
            c.draw.text("LAN MODE", c.width(0.5) + state.changeX, 80, theme.getTextColor(), 58, "Shantell Sans", "bold", "center");
        } else if (state.current === state.SETTINGS) {
            c.draw.text("SETTINGS", c.width(0.5) + state.changeX, 80, theme.getTextColor(), 58, "Shantell Sans", "bold", "center");

            c.draw.text("APPEARANCE", c.width(0.2) + state.changeX, 180, theme.getTextColor(), 32, "Shantell Sans", "bold", "center");
            c.draw.text("GRAPHICS", c.width(0.5) + state.changeX, 180, theme.getTextColor(), 32, "Shantell Sans", "bold", "center");
            c.draw.text("CONTROLS", c.width(0.8) + state.changeX, 180, theme.getTextColor(), 32, "Shantell Sans", "bold", "center");

            c.draw.text("Player name:", c.width(0.2) - Button.width / 2 - 25 + state.changeX, 250, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            c.draw.text("Preferred color:", c.width(0.2) - Button.width / 2 - 25 + state.changeX, 345, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            c.draw.text("Superpower:", c.width(0.2) - Button.width / 2 - 25 + state.changeX, 525, theme.getTextColor(), 24, "Shantell Sans", "", "left");

            const keybinds = ["Move left", "Move right", "Jump", "Attack", "Launch rocket", "Activate superpower", "Game menu"];
            for (let i=0; i<keybinds.length; i++)
                c.draw.text(keybinds[i], c.width(0.8) - Button.width / 2 - 25 + state.changeX, 250 + i * 60, theme.getTextColor(), 24, "Shantell Sans", "", "left");
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
