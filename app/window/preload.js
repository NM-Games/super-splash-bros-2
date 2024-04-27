const c = require("./canvas");
const image = require("./image");

const state = {
    MAIN_MENU: 0,
    LOCAL_GAME_MENU: 1,
    LAN_GAME_MENU: 2,
    PLAYING_FREEPLAY: 3,
    PLAYING_LOCAL: 4,
    PLAYING_LAN: 5,
    PROFILE_EDIT: 6
};
let currentState = state.MAIN_MENU;

const defaultButton = {width: 250, height: 100};

const buttons = [{
    state: state.MAIN_MENU,
    text: "Freeplay",
    getX: () => c.width(1/4),
    getY: () => c.height(1/3),
    width: defaultButton.width,
    height: defaultButton.height,
    hovering: false,
    onclick: () => {
        currentState = state.PLAYING_FREEPLAY;
    }
},
{
    state: state.MAIN_MENU,
    text: "Local game",
    getX: () => c.width(1/2),
    getY: () => c.height(1/3),
    width: defaultButton.width,
    height: defaultButton.height,
    hovering: false,
    onclick: () => {
        currentState = state.LOCAL_GAME_MENU;
    }
},
{
    state: state.MAIN_MENU,
    text: "LAN game",
    getX: () => c.width(3/4),
    getY: () => c.height(1/3),
    
    width: defaultButton.width,
    height: defaultButton.height,
    hovering: false,
    onclick: () => {
        currentState = state.LAN_GAME_MENU;
    }
}];

addEventListener("DOMContentLoaded", () => {
    c.init();

    addEventListener("mousemove", (e) => {
        for (const button of buttons) {
            if (button.state !== currentState) {
                button.hovering = false;
                continue;
            }

            button.hovering = (e.clientX > button.getX() - button.width / 2 && e.clientX < button.getX() + button.width / 2
             && e.clientY > button.getY() - button.height / 2 && e.clientY < button.getY() + button.height / 2);
        }
    });

    addEventListener("mousedown", (_e) => {
        for (const button of buttons) {
            if (button.hovering) {
                button.onclick();
                break;
            }
        }
    });

    const update = () => {

    };

    const draw = () => {
        c.clear();
        c.draw.fill.rect("rgb(35, 255, 255)", 0, 0, c.width(), c.height());

        c.draw.image(image.water, 0, c.height() - 100);
        for (const button of buttons) {
            if (button.state !== currentState) continue;

            c.draw.button(button.text, button.getX(), button.getY(), button.width, button.height, button.hovering);
        }
    };
    
    const loop = () => {
        update();
        draw();

        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
});
