const { ipcRenderer } = require("electron");

const c = require("./canvas");
const image = require("./image");
const theme = require("./theme");
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
        text: "Fullscreen",
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
    }),
    new Input({
        name: "Control-MoveLeft",
        state: state.SETTINGS,
        x: {screenFactor: 4/5, offset: 200},
        y: {screenFactor: 0, offset: 250},
        width: 50,
    })
];

addEventListener("DOMContentLoaded", () => {
    c.init();

    ipcRenderer.on("fullscreen-status", (_e, enabled) => {
        Button.getButtonById("Fullscreen").text = `Fullscreen: ${enabled ? "ON":"OFF"}`;
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

        for (const sprite of backgroundSprites) {
            sprite.y = Math.sin((frames + sprite.offset) / 40) * sprite.amplitude + c.height();
            if (sprite.y > c.height()) {
                sprite.visible = true;
                sprite.type = Math.floor(Math.random() * 4);
                sprite.facing = Math.round(Math.random());
            }
        }

        waterX -= 1;
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

        if (state.current === state.MAIN_MENU) c.draw.image(image.logo, c.width(0.5) - image.logo.width / 2 + state.changeX, 25, image.logo.width, image.logo.height);
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

            c.draw.text("Move left", c.width(0.8) - Button.width / 2 - 25 + state.changeX, 250, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            c.draw.text("Move right", c.width(0.8) - Button.width / 2 - 25 + state.changeX, 310, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            c.draw.text("Jump", c.width(0.8) - Button.width / 2 - 25 + state.changeX, 310, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            c.draw.text("Attack", c.width(0.8) - Button.width / 2 - 25 + state.changeX, 310, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            c.draw.text("Launch rocket", c.width(0.8) - Button.width / 2 - 25 + state.changeX, 310, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            c.draw.text("Activate superpower", c.width(0.8) - Button.width / 2 - 25 + state.changeX, 310, theme.getTextColor(), 24, "Shantell Sans", "", "left");
            c.draw.text("Game menu", c.width(0.8) - Button.width / 2 - 25 + state.changeX, 310, theme.getTextColor(), 24, "Shantell Sans", "", "left");
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
