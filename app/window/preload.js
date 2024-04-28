const { ipcRenderer } = require("electron");

const c = require("./canvas");
const image = require("./image");
const colors = require("./colors");
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

let frames = 0;
let waterX = 0;
/** @type {"daylight" | "sunset" | "night"} */
let theme = "daylight";

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
            this.hovegamering = false;
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
    // for the sprite color switch:
    new Button({
        text: "◂ Previous",
        state: state.SETTINGS,
        x: {screenFactor: 1/5, offset: -Button.width / 4 - 20},
        y: {screenFactor: 0, offset: 450},
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
        y: {screenFactor: 0, offset: 450},
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
        y: {screenFactor: 0, offset: 600},
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
        y: {screenFactor: 0, offset: 600},
        width: Button.width / 2,
        height: Button.height / 2,
        onclick: () => {
            // todo: switch superpowers
        }
    }),
];

Input.items = [
    new Input({
        name: "IP-1",
        state: state.LAN_GAME_MENU,
        x: {screenFactor: 1/2, offset: -300},
        y: {screenFactor: 1/2, offset: 100},
        width: 175,
        maxLength: 3,
        numbersOnly: true
    }),
    new Input({
        name: "Username",
        state: state.SETTINGS,
        x: {screenFactor: 1/5, offset: 0},
        y: {screenFactor: 0, offset: 280},
        width: Button.width + 50,
        size: 20
    })
];

addEventListener("DOMContentLoaded", () => {
    c.init();

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
        for (const input of Input.items) input.focused = (input.hovering && !state.changing);
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

        waterX -= 1;
        if (waterX < -image.water.width) waterX = 0;
    };

    const draw = () => {
        c.clear();
        c.draw.fill.rect(colors.theme[theme].primary, 0, 0, c.width(), c.height());

        let watersX = 0;
        while (watersX < c.width()) {
            c.draw.image(image.water, waterX + watersX, c.height() - 100);
            watersX += image.water.width;
        }
        c.draw.image(image.water, waterX + watersX, c.height() - 100);

        if (state.current === state.MAIN_MENU) c.draw.image(image.logo, c.width(0.5) - image.logo.width / 2 + state.changeX, 25, image.logo.width, image.logo.height);
        else if (state.current === state.LOCAL_GAME_MENU) c.draw.text("LOCAL MODE", c.width(0.5) + state.changeX, 80, (theme === "night") ? colors.text.light : colors.text.dark, 58, "Shantell Sans", "bold", "center");
        else if (state.current === state.LAN_GAME_MENU) c.draw.text("LAN MODE", c.width(0.5) + state.changeX, 80, (theme === "night") ? colors.text.light : colors.text.dark, 58, "Shantell Sans", "bold", "center");
        else if (state.current === state.SETTINGS) {
            c.draw.text("SETTINGS", c.width(0.5) + state.changeX, 80, (theme === "night") ? colors.text.light : colors.text.dark, 58, "Shantell Sans", "bold", "center");
            c.draw.text("APPEARANCE", c.width(0.2) + state.changeX, 180, (theme === "night") ? colors.text.light : colors.text.dark, 32, "Shantell Sans", "bold", "center");
            c.draw.text("GRAPHICS", c.width(0.5) + state.changeX, 180, (theme === "night") ? colors.text.light : colors.text.dark, 32, "Shantell Sans", "bold", "center");
            c.draw.text("CONTROLS", c.width(0.8) + state.changeX, 180, (theme === "night") ? colors.text.light : colors.text.dark, 32, "Shantell Sans", "bold", "center");
        }

        for (const button of Button.items) {
            if (button.state !== state.current) continue;

            c.draw.button(button.text, button.getX() + state.changeX, button.getY(), button.width, button.height, button.scale, button.hovering, button.active);
        }
        for (const input of Input.items) {
            if (input.state !== state.current) continue;

            c.draw.input(input.value, input.getX() + state.changeX, input.getY(), input.width, input.size, input.focused, frames % 40 < 20);
        }
    };
    
    const loop = () => {
        update();
        draw();

        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
});
