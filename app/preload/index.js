/** @callback EmptyCallback */

const { ipcRenderer, clipboard, shell } = require("electron");

const c = require("./canvas");
const image = require("./image");
const audio = require("./audio");
const theme = require("./theme");
const socket = require("./socket");
const gamepad = require("./gamepad");
const network = require("../network");
const Button = require("../class/ui/Button");
const Input = require("../class/ui/Input");
const MenuSprite = require("../class/ui/MenuSprite");
const Replay = require("../class/game/Replay");
const Game = require("../class/game/Game");
const Player = require("../class/game/Player");
const Exclusive = require("../class/game/Exclusive");
const Geyser = require("../class/game/Geyser");
const Fish = require("../class/game/Fish");

const state = {
    MAIN_MENU: 0,
    PLAY_MENU: 1,
    WAITING_LOCAL: 2,
    LAN_GAME_MENU: 3,
    WAITING_LAN_HOST: 4,
    WAITING_LAN_GUEST: 5,
    WAITING_FREEPLAY: 6,
    PLAYING_LOCAL: 7,
    PLAYING_LAN: 8,
    PLAYING_FREEPLAY: 9,
    SETTINGS: 10,
    ABOUT: 11,
    STATISTICS: 12,
    REPLAYS_MENU: 13,
    WATCHING_REPLAY: 14,
    TUTORIAL_PROMPT: 15,
    TUTORIAL_INTRO: 16,
    TUTORIAL_GAME: 17,
    TUTORIAL_POST_GAME: 18,

    current: 0,
    change: {
        /**
         * Change the current game state.
         * @param {number} toState
         * @param {boolean} inverted
         * @param {EmptyCallback} onchanged
         */
        to: (toState, inverted, onchanged = () => {}) => {
            if (state.change.active) return;

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
    },
    /**
     * Check whether the current state is one of the specified.
     * @param {...number} states
     * @returns {boolean}
     */
    is: (...states) => {
        return states.includes(state.current);
    },
    /**
     * Check whether the current state belongs to a menu.
     * @returns {boolean}
     */
    isMenu: () => {
        return state.is(
            state.MAIN_MENU,
            state.PLAY_MENU,
            state.SETTINGS,
            state.ABOUT,
            state.STATISTICS,
            state.REPLAYS_MENU,
            state.WAITING_LOCAL,
            state.LAN_GAME_MENU,
            state.WAITING_LAN_GUEST,
            state.WAITING_LAN_HOST,
            state.WAITING_FREEPLAY,
            state.TUTORIAL_PROMPT,
            state.TUTORIAL_INTRO,
            state.TUTORIAL_POST_GAME
        );
    }
};

const checkForUpdates = () => {
    versions.status = "Checking for updates...";
    fetch("https://api.github.com/repos/NM-Games/super-splash-bros-2/releases/latest").then(res => {
        res.json().then(json => {
            const tag = json.tag_name;
            if (res.ok && tag > versions.game) {
                dialog.show(
                    `Version ${tag} is available!`,
                    "Do you want to download it?",
                    new Button({
                        text: "Yes",
                        x: () => c.width(0.35),
                        y: () => c.height(0.75),
                        onclick: () => {
                            dialog.close();
                            shell.openExternal("https://github.com/NM-Games/super-splash-bros-2/releases");
                        }
                    }), new Button({
                        text: "Later",
                        x: () => c.width(0.65),
                        y: () => c.height(0.75),
                        onclick: () => dialog.close()
                    })
                );
                versions.status = `${tag} is available`;
            } else if (res.ok) versions.status = "Latest version";
            else versions.status = "Failed to check for updates";
        }).catch(() => versions.status = "Failed to check for updates");
    }).catch(() => versions.status = "Failed to check for updates");
};

const cannotSaveReplayAlert = () => {
    if (config.misc.recordReplays) Button.getButtonById("DoReplayRecording").onclick();
    Button.getButtonById("DoReplayRecording").disabled = true;
    dialog.show(
        "You are running low on disk space!",
        "Replay recording is disabled to prevent more chonky files.",
        new Button({
            text: "Close",
            x: () => c.width(0.5),
            y: () => c.height(0.75),
            onclick: () => {
                dialog.close();
                checkForUpdates();
            }
        })
    );
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
            state.change.to(asHost ? state.WAITING_LAN_HOST : state.WAITING_LAN_GUEST, false, () => {
                setConnectElementsState(false);
                if (water.flood.enabled) water.flood.disable();
            });
        },
        onclose: (e) => {
            if (state.current === state.LAN_GAME_MENU && e.reason) {
                connectionMessage.show(e.reason, theme.colors.error.foreground, 3);
                setConnectElementsState(false);
                if (water.flood.enabled) water.flood.disable();
            } else {
                if (state.current === state.PLAYING_LAN && !errorAlert.suppressed) water.flood.enable(true);
                isInGame = false;
                const reason = (e.reason) ? e.reason : "You have been disconnected because the game you were in was closed.";
                state.change.to(state.LAN_GAME_MENU, true, () => {
                    stop();
                    dialog.close();
                    gameMenu.visible = false;
                    water.flood.disable();
                    errorAlert.show(reason);
                });
            }
        },
        onerror: () => {
            connectionMessage.show("Failed to connect!", theme.colors.error.foreground, 3);
            setConnectElementsState(false);
            if (water.flood.enabled) water.flood.disable();
        },
        ontimeout: () => {
            connectionMessage.show("Connection timed out!", theme.colors.error.foreground, 3);
            setConnectElementsState(false);
            if (water.flood.enabled) water.flood.disable();
        }
    });
};

/**
 * Leave the game.
 * @param {boolean} playAgain For LAN mode only; tells whether to create/join a new game immediately.
 */
const leave = (playAgain = false) => {
    dialog.close();
    isInGame = false;
    gameMenu.set(false);
    water.flood.enable(false, false, () => {
        if (replay && config.misc.recordReplays) replay.save();

        if (state.current === state.PLAYING_LAN) {
            if (playerIndex === game.host) ipcRenderer.send("stop-gameserver", playAgain); else {
                socket.close();
                errorAlert.suppress();
                state.current = state.LAN_GAME_MENU;
                if (playAgain) setTimeout(() => Button.getButtonById("Connect").onclick(), 1000);
                stop();
            }
        } else if (state.is(state.PLAYING_LOCAL, state.PLAYING_FREEPLAY)) {
            state.current = state.PLAY_MENU;
            water.flood.disable();
            stop();
        } else if (state.current === state.WATCHING_REPLAY) {
            state.current = state.REPLAYS_MENU;
            water.flood.disable();
            stop();
        } else if (state.current === state.TUTORIAL_GAME) {
            state.current = state.TUTORIAL_POST_GAME;
            water.flood.disable();
            stop();
        }
        konamiEasterEgg.deactivate();
        if (!playAgain && !water.flood.disabling) water.flood.disable();
    });
    if (playerIndex > -1) ipcRenderer.send("update-stats", game.players[playerIndex].stats, playerIndex);
};

const stop = () => {
    theme.current = config.graphics.theme;
    instance = game = replay = undefined;
    playerIndex = -1;
};

/** Check the LAN availability and kick the player out of a menu if needed. */
const checkLANAvailability = () => {
    const LANavailable = (network.getIPs().length > 0);
    Button.getButtonById("LANMode").disabled = !LANavailable;
    if (state.is(state.LAN_GAME_MENU, state.WAITING_LAN_GUEST, state.WAITING_LAN_HOST, state.PLAYING_LAN) && !LANavailable)
        state.change.to(state.PLAY_MENU, true);
};

const keyChange = () => (JSON.stringify(keys) !== JSON.stringify(lastKeys));
const keybindIDs = ["moveLeft", "moveRight", "jump", "attack", "launchRocket", "activatePowerup", "gameMenu"];
const updateKeybinds = () => {
    for (const k of keybindIDs) config.controls[k] = Input.getInputById(`Keybind-${k}`).keybind;
    ipcRenderer.send("update-config", config);
};

/**
 * Check if the Infinite rockets power-up applies to the rocket counter.
 * @param {number} x
 */
const infiniteRocketCount = (x) => [null, Infinity].includes(x);

/** @type {import("../file").Settings} */
const config = {appearance: {}, graphics: {}, controls: {}, audio: {}};
const versions = {game: "", electron: "", chromium: "", status: ""};
/** @type {{moveLeft: boolean, moveRight: boolean, jump: boolean, attack: boolean, launchRocket: boolean, activatePowerup: boolean, gameMenu: boolean}} */
const keys = {};
for (const k of keybindIDs) keys[k] = false;

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
        showMessage: false,
        onfinishedenabling: () => {},
        onfinisheddisabling: () => {},
        /**
         * Enable flooding.
         * @param {boolean} boost
         * @param {boolean} message
         * @param {EmptyCallback} onfinished
         */
        enable: function(boost = false, message = false, onfinished = () => {}) {
            if (this.enabling) return;

            this.enabled = true;
            this.disabling = false;
            this.enabling = true;
            this.showMessage = message;
            this.onfinishedenabling = onfinished;
            this.levelSpeed = Number(boost) * c.height() / 10;
            audio._play(audio.flood);
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
const gamepadAlert = {
    x: -400,
    vx: 40,
    y: 100,
    width: 300,
    height: 120,
    offset: 50,
    visible: false,
    shownAt: -6e9,
    duration: 300,
    show: () => {
        if (!state.isMenu()) return;

        gamepadAlert.visible = true;
        gamepadAlert.shownAt = frames;
    }
};
const bigNotification = {
    size: 330,
    defaultSize: 330,
    v: 80,
    a: 1,
    va: 0.03,
    text: "",
    color: "",
    /**
     * Show a big notification, e.g. for a countdown or win message.
     * @param {string} text
     * @param {string} color
     * @param {number} size
     * @param {number} speed
     */
    show: (text, color, size = 330, speed = 0.03) => {
        bigNotification.text = text;
        bigNotification.color = color;
        bigNotification.defaultSize = size;
        bigNotification.size = bigNotification.defaultSize * 3;
        bigNotification.a = 0;
        bigNotification.va = speed;
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
            !state.is(state.PLAYING_FREEPLAY, state.PLAYING_LAN, state.PLAYING_LOCAL)
            || water.flood.enabling
            || (game && game.startState < 6)
        ) return;
        gameMenu.visible = !gameMenu.visible;
        if (gameMenu.visible) audio._play(audio.gamemenu);
    },
    /**
     * Set the game menu visibility state.
     * @param {boolean} to
     */
    set: (to) => {
        if (
            !state.is(state.PLAYING_FREEPLAY, state.PLAYING_LAN, state.PLAYING_LOCAL)
            || water.flood.enabling
            || (game && game.startState < 6)
        ) return;
        gameMenu.visible = to;
        if (gameMenu.visible) audio._play(audio.gamemenu);
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
const screenShake = {
    x: 0,
    y: 0,
    intensity: 10,
    update: () => {
        if (!game || !game.rockets || !game.circles || !game.geysers) return;

        const explosions = game.rockets.filter(r => r.explosion.active && r.x > -r.explosion.size / 2 && r.x < c.width() + r.explosion.size / 2);

        const condition = (explosions > 0 || game.circles.filter(x => x.shake).length > 0 || game.geysers.length > 0);
        screenShake.x = (condition) ? (Math.random() - 0.5) * screenShake.intensity * 2 : 0;
        screenShake.y = (condition) ? (Math.random() - 0.5) * screenShake.intensity * 2 : 0;
    }
};
const konamiEasterEgg = {
    keys: ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"],
    index: 0,
    isActive: () => konamiEasterEgg.index >= konamiEasterEgg.keys.length,
    deactivate: () => konamiEasterEgg.index = 0
};
const parallellogram = {
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
const replayActions = {
    /**
     * Watch a replay.
     * @param {number | string} target - The index of the replay list, or the full path to an imported replay.
     */
    watch: (target) => {
        const path = (typeof target === "number") ? `%%r/${Replay.list[target].name}` : target;
        water.flood.enable(false, false, () => {
            replay = new Replay(path, () => {
                state.current = state.WATCHING_REPLAY;
                theme.current = replay.theme;
                water.flood.disable();
                parallellogram.show();
                isInGame = true;
            });
        });
    },
    /**
     * Import and watch a replay.
     */
    import: () => {
        ipcRenderer.send("import-replay");
        ipcRenderer.once("replay-imported", (_e, path) => replayActions.watch(path));
    },
    /**
     * Export a replay.
     * @param {number} index
     */
    export: (index) => {
        ipcRenderer.send("export-replay", Replay.list[index].name);
        ipcRenderer.once("replay-export-started", () => dialog.show("Exporting replay...", "This may take a while."));
        ipcRenderer.once("replay-export-finished", (_e, path) => {
            dialog.show("Replay exported!", "", new Button({
                text: "Close",
                x: () => c.width(0.35),
                y: () => c.height(0.75),
                onclick: () => dialog.close()
            }), new Button({
                text: "Show in folder",
                x: () => c.width(0.65),
                y: () => c.height(0.75),
                onclick: () => {
                    dialog.close();
                    shell.showItemInFolder(path);
                }
            }));
        });
    },
    /**
     * Delete a replay.
     * @param {number} index
     */
    delete: (index) => {
        dialog.show(
            "Do you want to delete this replay?",
            "This action is irreversible!",
            new Button({
                text: "Yes",
                x: () => c.width(0.35),
                y: () => c.height(0.75),
                danger: true,
                onclick: () => {
                    dialog.close();
                    ipcRenderer.send("delete-replay", Replay.list[index].name);
                    Button.getButtonById(`Replay-${index}-Watch`).disabled =
                    Button.getButtonById(`Replay-${index}-Export`).disabled =
                    Button.getButtonById(`Replay-${index}-Delete`).disabled = delete Replay.list[index];
                }
            }), new Button({
                text: "No",
                x: () => c.width(0.65),
                y: () => c.height(0.75),
                onclick: () => dialog.close()
            })
        );
    }
};

let frames = 0;
let game = socket.getGame();
/** @type {game} */
let lgame;
/** @type {Game} */
let instance;
/** @type {Replay} */
let replay;
let ping = 0;
let isInGame = false;
let playerIndex = -1;
let banButton = {
    hoverIndex: -1,
    active: false
};
/** @type {import("../file").Statistics} */
let statistics;
let freeDiskSpace = Infinity;
let lastKeys = JSON.parse(JSON.stringify(keys));

Button.items = [
    // Main menu
    new Button({
        text: "Play game",
        state: state.MAIN_MENU,
        x: () => c.width(1/2),
        y: () => c.height(1/2) - 100,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.PLAY_MENU, false);
        }
    }),
    new Button({
        text: "Settings",
        state: state.MAIN_MENU,
        x: () => c.width(1/3) + 55,
        y: () => c.height(3/4) - 120,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.SETTINGS, false);
        }
    }),
    new Button({
        text: "About",
        state: state.MAIN_MENU,
        x: () => c.width(2/3) - 55,
        y: () => c.height(3/4) - 120,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.ABOUT, false);
        }
    }),
    new Button({
        text: "Statistics",
        state: state.MAIN_MENU,
        x: () => c.width(1/4),
        y: () => c.height(3/4),
        width: Button.width,
        height: Button.height,
        onclick: function() {
            this.hovering = false;
            ipcRenderer.send("get-stats");
            state.change.to(state.STATISTICS, false);
        }
    }),
    new Button({
        text: "Replays",
        state: state.MAIN_MENU,
        x: () => c.width(1/2),
        y: () => c.height(3/4),
        width: Button.width,
        height: Button.height,
        onclick: function() {
            this.hovering = false;
            ipcRenderer.send("get-replays");
            state.change.to(state.REPLAYS_MENU, false);
        }
    }),
    new Button({
        text: "Quit game",
        state: state.MAIN_MENU,
        x: () => c.width(3/4),
        y: () => c.height(3/4),
        width: Button.width,
        height: Button.height,
        danger: true,
        onclick: function() {
            this.hovering = false;
            ipcRenderer.send("quit");
        }
    }),
    // Play menu
    new Button({
        text: "Local mode",
        state: state.PLAY_MENU,
        x: () => c.width(0.7),
        y: () => 300,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.WAITING_LOCAL, false, () => {
                instance = new Game("local");
                instance.theme = config.graphics.theme;
                for (const i of gamepad.playerIndexes) {
                    instance.join({playerName: "", preferredColor: i, powerup: 0}, `10.0.0.${i}`);
                    instance.players[i].connected = false;
                }
                Button.getButtonById("LocalGameTheme").text = `Theme: ${instance.theme}`;
            });
        }
    }),
    new Button({
        id: "LANMode",
        text: "LAN mode",
        state: state.PLAY_MENU,
        x: () => c.width(0.7),
        y: () => 420,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.LAN_GAME_MENU, false);
        }
    }),
    new Button({
        text: "Freeplay mode",
        state: state.PLAY_MENU,
        x: () => c.width(0.7),
        y: () => 540,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.WAITING_FREEPLAY, false, () => {
                instance = new Game("freeplay");
                instance.theme = config.graphics.theme;
                instance.players[config.appearance.preferredColor] = new Player(config.appearance, config.appearance.preferredColor, instance.spawnCoordinates, instance.mode);
                instance.addDummies();
                instance.hostIndex = playerIndex = config.appearance.preferredColor;
                const difficulty = (instance.dummyDifficulty === 0) ? "None"
                : (instance.dummyDifficulty === 1) ? "Easy"
                : (instance.dummyDifficulty === 2) ? "Normal"
                : (instance.dummyDifficulty === 3) ? "Hard" : "CHAOS";
                Button.getButtonById("FreeplayGameTheme").text = `Theme: ${instance.theme}`;
                Button.getButtonById("FreeplayDummyDifficulty").text = `Difficulty: ${difficulty}`;
            });
        }
    }),
    new Button({
        id: `Back-${state.PLAY_MENU}`,
        text: "◂ Back",
        state: state.PLAY_MENU,
        x: () => Button.width / 3 + 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.MAIN_MENU, true);
        }
    }),
    // Local mode waiting menu
    new Button({
        id: `Back-${state.WAITING_LOCAL}`,
        text: "◂ Back",
        state: state.WAITING_LOCAL,
        x: () => Button.width / 3 + 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.PLAY_MENU, true, stop);
            theme.current = config.graphics.theme;
        }
    }),
    new Button({
        id: "LocalGameTheme",
        text: "Theme",
        state: state.WAITING_LOCAL,
        x: () => c.width(1/2) - 250,
        y: () => c.height(17/20),
        onclick: () => {
            instance.theme = theme.cycle(instance.theme)
            theme.current = instance.theme;
            Button.getButtonById("LocalGameTheme").text = `Theme: ${instance.theme}`;
        }
    }),
    new Button({
        id: "StartLocalGame",
        text: "Start!",
        state: state.WAITING_LOCAL,
        x: () => c.width(1/2) + 250,
        y: () => c.height(17/20),
        disabled: true,
        onclick: function() {
            this.hovering = false;
            banButton.hoverIndex = -1;
            instance.start();
        }
    }),
    // Local game powerup switchers
    new Button({
        id: "Local-PowerupPrev-0",
        icon: () => [0, 2],
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) + 150,
        y: () => c.height(0.2) + 40,
        width: 60,
        height: 60,
        disabled: true,
        onclick: () => {
            if (instance.players[gamepad.playerIndexes[0]].powerup.selected-- <= 0)
                instance.players[gamepad.playerIndexes[0]].powerup.selected = Game.powerups.length - 1;
        }
    }),
    new Button({
        id: "Local-PowerupNext-0",
        icon: () => [1, 2],
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) + 375,
        y: () => c.height(0.2) + 40,
        width: 60,
        height: 60,
        disabled: true,
        onclick: () => {
            if (instance.players[gamepad.playerIndexes[0]].powerup.selected++ >= Game.powerups.length - 1)
                instance.players[gamepad.playerIndexes[0]].powerup.selected = 0;
        }
    }),
    new Button({
        id: "Local-PowerupPrev-1",
        icon: () => [0, 2],
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) + 150,
        y: () => c.height(0.2) + 140,
        width: 60,
        height: 60,
        disabled: true,
        onclick: () => {
            if (instance.players[gamepad.playerIndexes[1]].powerup.selected-- <= 0)
                instance.players[gamepad.playerIndexes[1]].powerup.selected = Game.powerups.length - 1;
        }
    }),
    new Button({
        id: "Local-PowerupNext-1",
        icon: () => [1, 2],
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) + 375,
        y: () => c.height(0.2) + 140,
        width: 60,
        height: 60,
        disabled: true,
        onclick: () => {
            if (instance.players[gamepad.playerIndexes[1]].powerup.selected++ >= Game.powerups.length - 1)
                instance.players[gamepad.playerIndexes[1]].powerup.selected = 0;
        }
    }),
    new Button({
        id: "Local-PowerupPrev-2",
        icon: () => [0, 2],
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) + 150,
        y: () => c.height(0.2) + 240,
        width: 60,
        height: 60,
        disabled: true,
        onclick: () => {
            if (instance.players[gamepad.playerIndexes[2]].powerup.selected-- <= 0)
                instance.players[gamepad.playerIndexes[2]].powerup.selected = Game.powerups.length - 1;
        }
    }),
    new Button({
        id: "Local-PowerupNext-2",
        icon: () => [1, 2],
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) + 375,
        y: () => c.height(0.2) + 240,
        width: 60,
        height: 60,
        disabled: true,
        onclick: () => {
            if (instance.players[gamepad.playerIndexes[2]].powerup.selected++ >= Game.powerups.length - 1)
                instance.players[gamepad.playerIndexes[2]].powerup.selected = 0;
        }
    }),
    new Button({
        id: "Local-PowerupPrev-3",
        icon: () => [0, 2],
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) + 150,
        y: () => c.height(0.2) + 340,
        width: 60,
        height: 60,
        disabled: true,
        onclick: () => {
            if (instance.players[gamepad.playerIndexes[3]].powerup.selected-- <= 0)
                instance.players[gamepad.playerIndexes[3]].powerup.selected = Game.powerups.length - 1;
        }
    }),
    new Button({
        id: "Local-PowerupNext-3",
        icon: () => [1, 2],
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) + 375,
        y: () => c.height(0.2) + 340,
        width: 60,
        height: 60,
        disabled: true,
        onclick: () => {
            if (instance.players[gamepad.playerIndexes[3]].powerup.selected++ >= Game.powerups.length - 1)
                instance.players[gamepad.playerIndexes[3]].powerup.selected = 0;
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
            state.change.to(state.PLAY_MENU, true);
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
        icon: () => [Number(!config.audio.music), 0],
        state: state.SETTINGS,
        x: () => c.width() - 60,
        y: () => Button.height / 3 + 20,
        onclick: function() {
            config.audio.music = !config.audio.music;
            audio._update(config.audio);
            ipcRenderer.send("update-config", config);
        }
    }),
    new Button({
        icon: () => [Number(!config.audio.sfx), 1],
        state: state.SETTINGS,
        x: () => c.width() - 150,
        y: () => Button.height / 3 + 20,
        onclick: function() {
            config.audio.sfx = !config.audio.sfx;
            audio._update(config.audio);
            ipcRenderer.send("update-config", config);
        }
    }),
    // for the sprite color switch:
    new Button({
        icon: () => [0, 2],
        state: state.PLAY_MENU,
        x: () => c.width(0.3) - Button.width / 2 + state.change.x,
        y: () => 470,
        width: Button.height / 2,
        height: Button.height / 2,
        onclick: () => {
            if (config.appearance.preferredColor-- <= 0) config.appearance.preferredColor = 7;
            ipcRenderer.send("update-config", config);
        }
    }),
    new Button({
        icon: () => [1, 2],
        state: state.PLAY_MENU,
        x: () => c.width(0.3) + Button.width / 2 + state.change.x,
        y: () => 470,
        width: Button.height / 2,
        height: Button.height / 2,
        onclick: () => {
            if (config.appearance.preferredColor++ >= 7) config.appearance.preferredColor = 0;
            ipcRenderer.send("update-config", config);
        }
    }),
    // for the powerup switch:
    new Button({
        icon: () => [0, 2],
        state: state.PLAY_MENU,
        x: () => c.width(0.3) - Button.width / 2 + state.change.x,
        y: () => 650,
        width: Button.height / 2,
        height: Button.height / 2,
        onclick: () => {
            if (config.appearance.powerup-- <= 0)
                config.appearance.powerup = Game.powerups.length - 1;
            ipcRenderer.send("update-config", config);
        }
    }),
    new Button({
        icon: () => [1, 2],
        state: state.PLAY_MENU,
        x: () => c.width(0.3) + Button.width / 2 + state.change.x,
        y: () => 650,
        width: Button.height / 2,
        height: Button.height / 2,
        onclick: () => {
            if (config.appearance.powerup++ >= Game.powerups.length - 1)
                config.appearance.powerup = 0;
            ipcRenderer.send("update-config", config);
        }
    }),
    new Button({
        id: "Theme",
        text: "Theme",
        state: state.SETTINGS,
        x: () => c.width(0.3),
        y: () => 280,
        onclick: function() {
            config.graphics.theme = theme.current = theme.cycle();
            this.text = `Theme: ${theme.current}`;
            ipcRenderer.send("update-config", config);
        }
    }),
    new Button({
        id: "Fullscreen",
        text: "Full screen",
        state: state.SETTINGS,
        x: () => c.width(0.3),
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
        x: () => c.width(0.3),
        y: () => 480,
        onclick: function() {
            config.graphics.waterFlow = !config.graphics.waterFlow;
            this.text = `Water flow: ${config.graphics.waterFlow ? "ON":"OFF"}`;
            ipcRenderer.send("update-config", config);
        }
    }),
    new Button({
        id: "MenuSprites",
        text: "Menu sprites: ON",
        state: state.SETTINGS,
        x: () => c.width(0.3),
        y: () => 580,
        onclick: function() {
            config.graphics.menuSprites = !config.graphics.menuSprites;
            this.text = `Menu sprites: ${config.graphics.menuSprites ? "ON":"OFF"}`;
            ipcRenderer.send("update-config", config);
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
            state.change.to(state.MAIN_MENU, true);
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
    // Statistics menu
    new Button({
        id: `Back-${state.STATISTICS}`,
        text: "◂ Back",
        state: state.STATISTICS,
        x: () => Button.width / 3 + 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        onclick: function() {
            this.hovering = false;
            state.change.to(state.MAIN_MENU, true);
        }
    }),
    // Replays menu
    new Button({
        id: `Back-${state.REPLAYS_MENU}`,
        text: "◂ Back",
        state: state.REPLAYS_MENU,
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
        id: "DoReplayRecording",
        text: "Record replays",
        state: state.REPLAYS_MENU,
        width: Button.width + 50,
        x: () => c.width(1/3),
        y: () => c.height(0.375) - 70,
        onclick: function() {
            config.misc.recordReplays = !config.misc.recordReplays;
            this.text = `Record replays: ${config.misc.recordReplays ? "ON":"OFF"}`;
            ipcRenderer.send("update-config", config);
        }
    }),
    new Button({
        text: "Import replay",
        state: state.REPLAYS_MENU,
        width: Button.width + 50,
        x: () => c.width(2/3),
        y: () => c.height(0.375) - 70,
        onclick: function() {
            this.hovering = false;
            replayActions.import();
        }
    }),
    new Button({
        id: "Replay-0-Watch",
        text: "Watch",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 50,
        y: () => c.height(1/2) - 40,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        disabled: true,
        onclick: function() {
            this.hovering = false;
            replayActions.watch(0);
        }
    }),
    new Button({
        id: "Replay-0-Export",
        text: "Export",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 270,
        y: () => c.height(1/2) - 40,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        disabled: true,
        onclick: () => replayActions.export(0)
    }),
    new Button({
        id: "Replay-0-Delete",
        text: "Delete",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 490,
        y: () => c.height(1/2) - 40,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        danger: true,
        disabled: true,
        onclick: function() {
            this.hovering = false;
            replayActions.delete(0);
        }
    }),
    new Button({
        id: "Replay-1-Watch",
        text: "Watch",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 50,
        y: () => c.height(1/2) + 40,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        disabled: true,
        onclick: function() {
            this.hovering = false;
            replayActions.watch(1);
        }
    }),
    new Button({
        id: "Replay-1-Export",
        text: "Export",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 270,
        y: () => c.height(1/2) + 40,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        disabled: true,
        onclick: () => replayActions.export(1)
    }),
    new Button({
        id: "Replay-1-Delete",
        text: "Delete",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 490,
        y: () => c.height(1/2) + 40,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        danger: true,
        disabled: true,
        onclick: function() {
            this.hovering = false;
            replayActions.delete(1);
        }
    }),
    new Button({
        id: "Replay-2-Watch",
        text: "Watch",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 50,
        y: () => c.height(1/2) + 120,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        disabled: true,
        onclick: function() {
            this.hovering = false;
            replayActions.watch(2);
        }
    }),
    new Button({
        id: "Replay-2-Export",
        text: "Export",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 270,
        y: () => c.height(1/2) + 120,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        disabled: true,
        onclick: () => replayActions.export(2)
    }),
    new Button({
        id: "Replay-2-Delete",
        text: "Delete",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 490,
        y: () => c.height(1/2) + 120,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        danger: true,
        disabled: true,
        onclick: function() {
            this.hovering = false;
            replayActions.delete(2);
        }
    }),
    new Button({
        id: "Replay-3-Watch",
        text: "Watch",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 50,
        y: () => c.height(1/2) + 200,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        disabled: true,
        onclick: function() {
            this.hovering = false;
            replayActions.watch(3);
        }
    }),
    new Button({
        id: "Replay-3-Export",
        text: "Export",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 270,
        y: () => c.height(1/2) + 200,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        disabled: true,
        onclick: () => replayActions.export(3)
    }),
    new Button({
        id: "Replay-3-Delete",
        text: "Delete",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 490,
        y: () => c.height(1/2) + 200,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        danger: true,
        disabled: true,
        onclick: function() {
            this.hovering = false;
            replayActions.delete(3);
        }
    }),
    new Button({
        id: "Replay-4-Watch",
        text: "Watch",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 50,
        y: () => c.height(1/2) + 280,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        disabled: true,
        onclick: function() {
            this.hovering = false;
            replayActions.watch(4);
        }
    }),
    new Button({
        id: "Replay-4-Export",
        text: "Export",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 270,
        y: () => c.height(1/2) + 280,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        disabled: true,
        onclick: () => replayActions.export(4)
    }),
    new Button({
        id: "Replay-4-Delete",
        text: "Delete",
        state: state.REPLAYS_MENU,
        x: () => c.width(1/2) + 490,
        y: () => c.height(1/2) + 280,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        danger: true,
        disabled: true,
        onclick: function() {
            this.hovering = false;
            replayActions.delete(4);
        }
    }),
    // Replay screen
    new Button({
        icon: () => [0, 2],
        state: state.WATCHING_REPLAY,
        x: () => 50,
        y: () => 50,
        danger: true,
        onclick: function() {
            this.hovering = false;
            replay.paused = true;
            leave();
        }
    }),
    new Button({
        icon: () => [Number(!parallellogram.visible), 5],
        state: state.WATCHING_REPLAY,
        x: () => c.width() - 50,
        y: () => 50,
        onclick: () => {
            if (parallellogram.visible) parallellogram.hide();
            else parallellogram.show();
        }
    }),
    new Button({
        id: "Replay-NextFrame",
        icon: () => [1, 4],
        state: state.WATCHING_REPLAY,
        x: () => c.width() - 170,
        y: () => 50,
        onclick: () => replay.nextFrame()
    }),
    new Button({
        icon: () => [Number(!replay.paused), 3],
        state: state.WATCHING_REPLAY,
        x: () => c.width() - 250,
        y: () => 50,
        onclick: () => replay.togglePause()
    }),
    new Button({
        id: "Replay-PrevFrame",
        icon: () => [0, 4],
        state: state.WATCHING_REPLAY,
        x: () => c.width() - 330,
        y: () => 50,
        onclick: () => replay.previousFrame()
    }),
    new Button({
        id: "Replay-FasterRate",
        icon: () => [1, 2],
        state: state.WATCHING_REPLAY,
        x: () => c.width() - 450,
        y: () => 50,
        onclick: () => replay.increasePlaybackRate()
    }),
    new Button({
        id: "Replay-SlowerRate",
        icon: () => [0, 2],
        state: state.WATCHING_REPLAY,
        x: () => c.width() - 600,
        y: () => 50,
        onclick: () => replay.decreasePlaybackRate()
    }),
    new Button({
        id: "Replay-SaveScreenshot",
        icon: () => [2, 5],
        state: state.WATCHING_REPLAY,
        x: () => c.width() - 720,
        y: () => 50,
        onclick: function() {
            this.hovering = false;
            c.screenshot(`${replay.name.slice(0, replay.name.lastIndexOf("."))}-frame-${replay.frameIndex}.png`)
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
            if (game && game.connected > 1) {
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
        id: "LANGameTheme",
        text: "Theme",
        state: state.WAITING_LAN_HOST,
        x: () => c.width(1/2) - 360,
        y: () => c.height(17/20),
        onclick: () => ipcRenderer.send("lan-cycle-theme")
    }),
    new Button({
        id: "LANUnban",
        text: "Unban everyone",
        state: state.WAITING_LAN_HOST,
        disabled: true,
        x: () => c.width(1/2),
        y: () => c.height(17/20),
        onclick: function() {
            this.hovering = false;
            ipcRenderer.send("lan-unban");
        }
    }),
    new Button({
        id: "StartLANGame",
        text: "Start!",
        state: state.WAITING_LAN_HOST,
        x: () => c.width(1/2) + 360,
        y: () => c.height(17/20),
        disabled: true,
        onclick: function() {
            this.hovering = false;
            banButton.hoverIndex = -1;
            ipcRenderer.send("lan-start");
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
            state.change.to(state.LAN_GAME_MENU, true, stop);
        }
    }),
    // Freeplay game waiting menu
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
            state.change.to(state.PLAY_MENU, true, stop);
            theme.current = config.graphics.theme;
        }
    }),
    new Button({
        id: "FreeplayGameTheme",
        text: "Theme",
        state: state.WAITING_FREEPLAY,
        x: () => c.width(1/2) - 360,
        y: () => c.height(17/20),
        onclick: () => {
            instance.theme = theme.cycle(instance.theme)
            theme.current = instance.theme;
            Button.getButtonById("FreeplayGameTheme").text = `Theme: ${instance.theme}`;
        }
    }),
    new Button({
        id: "FreeplayDummyDifficulty",
        text: "Dummy fire",
        state: state.WAITING_FREEPLAY,
        x: () => c.width(1/2),
        y: () => c.height(17/20),
        onclick: () => {
            if (instance.dummyDifficulty++ >= 4) instance.dummyDifficulty = 0;
            const difficulty = (instance.dummyDifficulty === 0) ? "None"
             : (instance.dummyDifficulty === 1) ? "Easy"
             : (instance.dummyDifficulty === 2) ? "Normal"
             : (instance.dummyDifficulty === 3) ? "Hard" : "CHAOS";
            Button.getButtonById("FreeplayDummyDifficulty").text = `Difficulty: ${difficulty}`;
        }
    }),
    new Button({
        id: "StartFreeplayGame",
        text: "Start!",
        state: state.WAITING_FREEPLAY,
        x: () => c.width(1/2) + 360,
        y: () => c.height(17/20),
        onclick: function() {
            this.hovering = false;
            banButton.hoverIndex = -1;
            instance.start();
        }
    }),
    // Tutorial
    new Button({
        text: "Quit",
        state: state.TUTORIAL_PROMPT,
        x: () => Button.width / 3 + 20,
        y: () => Button.height / 3 + 20,
        width: Button.width / 1.5,
        height: Button.height / 1.5,
        danger: true,
        onclick: function() {
            this.hovering = false;
            ipcRenderer.send("quit");
        }
    }),
    new Button({
        text: "Yes",
        state: state.TUTORIAL_PROMPT,
        x: () => c.width(0.35),
        y: () => c.height(0.75),
        onclick: function() {
            this.hovering = false;
            state.change.to(state.TUTORIAL_INTRO, false, () => {
                instance = new Game("tutorial");
                playerIndex = instance.hostIndex;
            });
        }
    }),
    new Button({
        text: "No",
        state: state.TUTORIAL_PROMPT,
        x: () => c.width(0.65),
        y: () => c.height(0.75),
        onclick: function() {
            this.hovering = false;
            config.misc.tutorialPrompt = false;
            ipcRenderer.send("update-config", config);
            state.change.to(state.MAIN_MENU);
        }
    }),
    new Button({
        text: "Next ▸",
        state: state.TUTORIAL_INTRO,
        x: () => c.width(0.5),
        y: () => c.height(0.75),
        onclick: function() {
            this.hovering = false;
            instance.start();
        }
    }),
    new Button({
        text: "Let's go!",
        state: state.TUTORIAL_POST_GAME,
        x: () => c.width(0.5),
        y: () => c.height(0.75),
        onclick: function() {
            this.hovering = false;
            config.misc.tutorialPrompt = false;
            ipcRenderer.send("update-config", config);
            state.change.to(state.MAIN_MENU);
        }
    })
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
            if (state.current === state.WATCHING_REPLAY) leave();
            else dialog.show(
                "Are you sure you want to leave?",
                (state.current === state.PLAYING_FREEPLAY) ? ""
                : (playerIndex === game.host) ? "Because you are the host, you will kick everyone out!"
                : "You will not be able to rejoin this game.",
                new Button({
                    text: "Yes",
                    x: () => c.width(0.35),
                    y: () => c.height(0.75),
                    danger: true,
                    onclick: leave
                }), new Button({
                    text: "No",
                    x: () => c.width(0.65),
                    y: () => c.height(0.75),
                    onclick: () => dialog.close()
                })
            );
        }
    }),
    new Button({
        icon: () => [Number(!config.audio.music), 0],
        x: () => gameMenu.x - gameMenu.width / 1.5,
        y: () => c.height() - 70,
        onclick: function() {
            config.audio.music = !config.audio.music;
            audio._update(config.audio);
            ipcRenderer.send("update-config", config);
        }
    }),
    new Button({
        icon: () => [Number(!config.audio.sfx), 1],
        x: () => gameMenu.x - gameMenu.width / 3,
        y: () => c.height() - 70,
        onclick: function() {
            config.audio.sfx = !config.audio.sfx;
            audio._update(config.audio);
            ipcRenderer.send("update-config", config);
        }
    })
];

Input.items = [
    new Input({
        id: "Local-Player0",
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) - 114,
        y: () => c.height(0.2) + 40,
        width: 400,
        disabled: true,
        ontab: function(shift) {
            if (shift) return;
            this.switchToID("Local-Player1");
        }
    }),
    new Input({
        id: "Local-Player1",
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) - 114,
        y: () => c.height(0.2) + 140,
        width: 400,
        disabled: true,
        ontab: function(shift) {
            this.switchToID(`Local-Player${shift ? 0 : 2}`);
        }
    }),
    new Input({
        id: "Local-Player2",
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) - 114,
        y: () => c.height(0.2) + 240,
        width: 400,
        disabled: true,
        ontab: function(shift) {
            this.switchToID(`Local-Player${shift ? 1 : 3}`);
        }
    }),
    new Input({
        id: "Local-Player3",
        state: state.WAITING_LOCAL,
        x: () => c.width(0.5) - 114,
        y: () => c.height(0.2) + 340,
        width: 400,
        disabled: true,
        ontab: function(shift) {
            if (!shift) return;
            this.switchToID("Local-Player2");
        }
    }),
    new Input({
        id: "IP-1",
        state: state.LAN_GAME_MENU,
        x: () => c.width(1/2) - 180,
        y: () => c.height(1/2) + 100,
        width: 100,
        maxLength: 3,
        numbersOnly: true,
        onmaxlengthreached: function() {
            this.switchToID("IP-2");
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
            this.switchToID("IP-3");
        },
        onemptybackspace: function() {
            this.switchToID("IP-1");
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
            this.switchToID("IP-4");
        },
        onemptybackspace: function() {
            this.switchToID("IP-2");
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
            this.switchToID("IP-3");
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
        state: state.PLAY_MENU,
        x: () => c.width(0.3),
        y: () => 285,
        width: Button.width + 50,
        size: 25,
        onblur: function() {
            if (this.value.trim().length === 0) this.value = Player.generateName();
            config.appearance.playerName = this.value.slice(0, this.maxLength);
            ipcRenderer.send("update-config", config);
        }
    }),
    new Input({
        id: "Keybind-moveLeft",
        state: state.SETTINGS,
        x: () => c.width(0.7) + 150,
        y: () => 240,
        width: 100,
        keybind: true,
        onkeybindselected: updateKeybinds
    }),
    new Input({
        id: "Keybind-moveRight",
        state: state.SETTINGS,
        x: () => c.width(0.7) + 150,
        y: () => 300,
        width: 100,
        keybind: true,
        onkeybindselected: updateKeybinds
    }),
    new Input({
        id: "Keybind-jump",
        state: state.SETTINGS,
        x: () => c.width(0.7) + 150,
        y: () => 360,
        width: 100,
        keybind: true,
        onkeybindselected: updateKeybinds
    }),
    new Input({
        id: "Keybind-attack",
        state: state.SETTINGS,
        x: () => c.width(0.7) + 150,
        y: () => 420,
        width: 100,
        keybind: true,
        onkeybindselected: updateKeybinds
    }),
    new Input({
        id: "Keybind-launchRocket",
        state: state.SETTINGS,
        x: () => c.width(0.7) + 150,
        y: () => 480,
        width: 100,
        keybind: true,
        onkeybindselected: updateKeybinds
    }),
    new Input({
        id: "Keybind-activatePowerup",
        state: state.SETTINGS,
        x: () => c.width(0.7) + 150,
        y: () => 540,
        width: 100,
        keybind: true,
        onkeybindselected: updateKeybinds
    }),
    new Input({
        id: "Keybind-gameMenu",
        state: state.SETTINGS,
        x: () => c.width(0.7) + 150,
        y: () => 600,
        width: 100,
        keybind: true,
        onkeybindselected: updateKeybinds
    })
];

addEventListener("DOMContentLoaded", () => {
    c.init();

    audio.music.loop = true;

    checkLANAvailability();
    setInterval(checkLANAvailability, 5000);
    setInterval(() => ping = (game) ? new Date().getTime() - game.ping : 0, 1000);

    const ip = network.getIPs()[0] ?? "...";
    const ipFragments = ip.split(".");
    for (let i=0; i<3; i++) Input.getInputById(`IP-${i + 1}`).value = ipFragments[i];

    ipcRenderer.on("quit-check", () => {
        if (state.is(state.PLAYING_LOCAL, state.PLAYING_LAN, state.PLAYING_FREEPLAY)
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
        ipcRenderer.send("update-config", config);
    });
    ipcRenderer.on("start", (_e, conf, ver, diskSpace, maxWidth) => {
        for (let i in conf) config[i] = conf[i];
        for (let i in ver) versions[i] = ver[i];
        freeDiskSpace = diskSpace;
        MenuSprite.generate(maxWidth);
        if (config.misc.tutorialPrompt) state.current = state.TUTORIAL_PROMPT;

        Input.getInputById("Username").value = config.appearance.playerName;

        theme.current = config.graphics.theme;
        Button.getButtonById("Theme").text = `Theme: ${theme.current}`;

        if (config.graphics.fullScreen) ipcRenderer.send("toggle-fullscreen");
        Button.getButtonById("WaterFlow").text = `Water flow: ${config.graphics.waterFlow ? "ON":"OFF"}`;
        Button.getButtonById("MenuSprites").text = `Menu sprites: ${config.graphics.menuSprites ? "ON":"OFF"}`;
        
        Button.getButtonById("DoReplayRecording").text = `Record replays: ${config.misc.recordReplays ? "ON":"OFF"}`;

        for (const k of keybindIDs) {
            Input.getInputById(`Keybind-${k}`).keybind = config.controls[k];
            Input.getInputById(`Keybind-${k}`).value = Input.displayKeybind(config.controls[k]);
        }

        audio._update(config.audio);
    });
    ipcRenderer.on("replay-error", (_e, err) => {
        dialog.close();
        water.flood.disable();
        errorAlert.show(err);
    });
    ipcRenderer.on("gameserver-error", (_e, err) => {
        errorAlert.show(`${err.name}: ${err.message}`);
        setConnectElementsState(false);
    });
    ipcRenderer.on("gameserver-stopped", (_e, playAgain) => {
        errorAlert.suppress();
        if (state.current === state.WAITING_LAN_HOST) state.change.to(state.LAN_GAME_MENU, true, stop); else {
            state.current = state.LAN_GAME_MENU;
            setTimeout(() => {
                stop();
                if (playAgain) Button.getButtonById("CreateGame").onclick();
            }, 50);
        }
    });

    ipcRenderer.on("stats-list", (_e, stats) => statistics = stats);
    ipcRenderer.on("replay-list", (_e, replays) => {
        Replay.list = replays;
        for (let i=0; i<5; i++) {
            if (!Button.getButtonById(`Replay-${i}-Watch`)) continue;

            Button.getButtonById(`Replay-${i}-Watch`).disabled =
            Button.getButtonById(`Replay-${i}-Export`).disabled =
            Button.getButtonById(`Replay-${i}-Delete`).disabled = !Replay.list[i];
        }
    });

    setInterval(() => {
        const discordState = (state.current === state.PLAYING_LOCAL) ? "Local mode"
        : (state.current === state.PLAYING_LAN) ? "LAN mode"
        : (state.current === state.PLAYING_FREEPLAY) ? "Freeplay mode"
        : (state.current === state.WATCHING_REPLAY) ? "Watching a replay"
        : (state.is(state.TUTORIAL_INTRO, state.TUTORIAL_GAME, state.TUTORIAL_POST_GAME)) ? "Following the tutorial"
        : (state.is(state.WAITING_FREEPLAY, state.WAITING_LAN_GUEST, state.WAITING_LAN_HOST, state.WAITING_LOCAL)) ? "Waiting for start"
        : undefined;

        let partySize;
        let partyMax;
        let startTimestamp;
        if (game && game.players) {
            partySize = game.players.filter(p => p && p.connected).length;
            partyMax = (state.is(state.WAITING_LOCAL, state.PLAYING_LOCAL)) ? 4 : game.players.length;
            if (game.startedOn > 0) startTimestamp = game.startedOn;
        }

        ipcRenderer.send("discord-activity-update",
            discordState,
            (playerIndex > -1) ? playerIndex : config.appearance.preferredColor,
            config.appearance.playerName,
            partySize,
            partyMax,
            startTimestamp
        );
    }, 15000);

    addEventListener("keydown", (e) => {
        const key = e.key.toLowerCase();
        const button = Button.getButtonById(`Back-${state.current}`);
        if (key === "escape" && dialog.visible) dialog.close();
        else if (key === "escape" && button !== null && !button.disabled && !Input.isRemapping) {
            button.onclick();
            audio._play(audio.click_back);
        } else if (key === "v" && e.ctrlKey && Input.getInputById("Username").focused) {
            Input.getInputById("Username").value += clipboard.readText();
            Input.getInputById("Username").value = Input.getInputById("Username").value.slice(0, Input.getInputById("Username").maxLength);
        } else if (key === "backspace" && e.ctrlKey && Input.getInputById("Username").focused) {
            Input.getInputById("Username").value = "";
        } else if (key === config.controls.gameMenu.toLowerCase() && !gameMenu.holdingKey && isInGame) {
            gameMenu.holdingKey = true;
            gameMenu.toggle();
        }

        if (key === "f1") shell.openExternal("https://github.com/NM-Games/super-splash-bros-2/blob/main/README.md");
        else if (key === "f11") ipcRenderer.send("toggle-fullscreen");
        else if (key === "f12") ipcRenderer.send("toggle-devtools");

        if (!konamiEasterEgg.isActive()) {
            if (key === konamiEasterEgg.keys[konamiEasterEgg.index].toLowerCase()) konamiEasterEgg.index++;
            else konamiEasterEgg.deactivate();
        }

        if (game) {
            for (const k of keybindIDs) {
                if (key === config.controls[k].toLowerCase()) {
                    keys[k] = true;
                    break;
                }
            }
            if (keyChange()) {
                if (state.current === state.PLAYING_LAN) socket.sendKeys(keys);
                else if (state.is(state.PLAYING_FREEPLAY, state.TUTORIAL_GAME)) instance.players[instance.hostIndex].setKeys(keys);
            }
            lastKeys = JSON.parse(JSON.stringify(keys));
        }
    });
    addEventListener("keyup", (e) => {
        const key = e.key.toLowerCase();
        if (game) {
            for (const k of keybindIDs) {
                if (key === config.controls[k].toLowerCase()) {
                    keys[k] = false;
                    break;
                }
            }
            if (keyChange()) {
                if (state.current === state.PLAYING_LAN) socket.sendKeys(keys);
                else if (state.is(state.PLAYING_FREEPLAY, state.TUTORIAL_GAME)) instance.players[instance.hostIndex].setKeys(keys);
            }
            lastKeys = JSON.parse(JSON.stringify(keys));
        }

        if (key === config.controls.gameMenu.toLowerCase()) gameMenu.holdingKey = false;
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

            if (state.is(state.WAITING_LAN_HOST, state.WAITING_FREEPLAY) && !water.flood.enabled && game) {
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

            if (input.focused && input.keybind) Input.isRemapping = true;
        }
        if (banButton.hoverIndex > -1) banButton.active = true;
    });
    addEventListener("mouseup", (_e) => {
        for (const button of getHoverableButtons()) {
            if (button.active && button.hovering && !button.disabled) {
                button.active = false;
                button.onclick();
                audio._play(button.text.startsWith("◂") ? audio.click_back : audio.click);
                break;
            } else if (button.active) button.active = false;
        }
        if (banButton.hoverIndex > -1 && banButton.active) {
            if (state.current === state.WAITING_LAN_HOST) ipcRenderer.send("lan-ban", banButton.hoverIndex);
            else if (state.current === state.WAITING_FREEPLAY) instance.ban(banButton.hoverIndex);
            audio._play(audio.ban);
        }
        banButton.hoverIndex = -1;
        banButton.active = false;
    });

    addEventListener("gamepadconnected", (e) => {
        gamepad.set(e.gamepad, true);
        gamepadAlert.show();
    });
    addEventListener("gamepaddisconnected", (e) => {
        gamepad.set(e.gamepad, false);
        gamepadAlert.show();
    });

    const update = () => {
        frames++;
        if (socket.isOpen()) {
            game = socket.getGame();
            if (replay && config.misc.recordReplays) replay.recordFrame(game);
        } else if (state.is(state.WAITING_LOCAL, state.PLAYING_LOCAL, state.WAITING_FREEPLAY, state.PLAYING_FREEPLAY, state.TUTORIAL_INTRO, state.TUTORIAL_GAME)) {
            instance.update();
            game = instance.export();
            if (replay && config.misc.recordReplays) replay.recordFrame(game);
        } else if (state.is(state.WATCHING_REPLAY)) {
            replay.update();
            game = replay.frames[replay.frameIndex];
        }

        if (game) {
            if (state.is(state.WAITING_LOCAL, state.PLAYING_LOCAL)) gamepad.update(instance);
            if (!lgame) lgame = JSON.parse(JSON.stringify(game));

            Button.getButtonById("StartLANGame").disabled = (game.connected <= 1);
            Button.getButtonById("LANUnban").disabled = (game.banCount === 0);
            Button.getButtonById(`Back-${state.WAITING_LAN_HOST}`).danger = (game.connected > 1);

            if (lgame.startState === 0 && game.startState === 1) {
                water.flood.enable(false, !state.is(state.TUTORIAL_INTRO, state.TUTORIAL_GAME));
            } else if (lgame.startState === 1 && game.startState === 2) {
                state.current = (state.current === state.WAITING_LOCAL) ? state.PLAYING_LOCAL
                : (state.current === state.WAITING_FREEPLAY) ? state.PLAYING_FREEPLAY
                : (state.is(state.WAITING_LAN_HOST, state.WAITING_LAN_GUEST)) ? state.PLAYING_LAN
                : (state.current === state.TUTORIAL_INTRO) ? state.TUTORIAL_GAME
                : state.current;
                isInGame = true;
                water.flood.disable();
                replay = new Replay();
            } else if (lgame.startState === 2 && game.startState === 3) {
                audio._play(audio.countdown);
                bigNotification.show("3", theme.colors.bigNotification.r);
                if (state.current !== state.WATCHING_REPLAY) parallellogram.show();
            } else if (lgame.startState === 3 && game.startState === 4) {
                audio._play(audio.countdown);
                bigNotification.show("2", theme.colors.bigNotification.o);
            } else if (lgame.startState === 4 && game.startState === 5) {
                audio._play(audio.countdown);
                bigNotification.show("1", theme.colors.bigNotification.y);
            } else if (lgame.startState === 5 && game.startState === 6) {
                audio._play(audio.countdown_go);
                bigNotification.show("GO!", theme.colors.bigNotification.g);
            } else if (lgame.startState === 6 && game.startState === 7) {
                const message = {text: "", color: "", size: 0};
                if (state.current === state.PLAYING_LAN) {
                    message.text = (game.winner === playerIndex) ? "YOU WIN!" : "YOU LOSE";
                    message.color = (game.winner === playerIndex) ? "g" : "r";
                    message.size = 240;

                    if (game.winner === playerIndex) {
                        audio._play(audio.end_victory);
                    } else audio._play(audio.end_defeat);
                } else if (state.is(state.PLAYING_LOCAL, state.PLAYING_FREEPLAY)) {
                    message.text = "GAME ENDED";
                    message.color = "o";
                    message.size = 180;

                    audio._play(audio.end_defeat);
                }
                bigNotification.show(message.text, theme.colors.bigNotification[message.color], message.size, 0.01);
            } else if (lgame.startState === 7 && game.startState === 8 && state.current !== state.WATCHING_REPLAY) leave(state.is(state.PLAYING_LAN));

            if (!state.is(state.WAITING_LOCAL, state.PLAYING_LOCAL, state.LAN_GAME_MENU, state.WATCHING_REPLAY)) {
                if (!lgame.players[playerIndex].powerup.available && game.players[playerIndex].powerup.available) {
                    const powerupName = Game.powerups[game.players[playerIndex].powerup.selected].name.toUpperCase();
                    bigNotification.show(`${powerupName} READY`, theme.colors.bigNotification.g, 120, 0.003);
                    audio._play(audio.powerup);
                }
                if (lgame.players[playerIndex].lives > 0 && game.players[playerIndex].lives === 0) {
                    bigNotification.show("GAME OVER", theme.colors.bigNotification.r, 200, 0.008);
                    audio._play(audio.end_defeat);
                }

                if (state.is(state.PLAYING_FREEPLAY) && lgame.players.filter(p => p && p.lives > 0).length > 1 &&
                 game.players.filter(p => p && p.lives > 0).length === 1 && game.players[playerIndex].lives > 0) {
                    bigNotification.show("VICTORY!", theme.colors.bigNotification.g, 220, 0.008);
                    audio._play(audio.end_victory);
                }
            }
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
        MenuSprite.update(frames, config.graphics.menuSprites, konamiEasterEgg.isActive());

        bigNotification.size = Math.max(bigNotification.defaultSize, bigNotification.size - bigNotification.v);
        if (bigNotification.size > bigNotification.defaultSize) bigNotification.a = Math.min(2, bigNotification.a + 0.2);
        else bigNotification.a = Math.max(0, bigNotification.a - bigNotification.va);

        let hoverings = {button: 0, input: 0};
        for (const button of getHoverableButtons()) {
            if (button.hovering) hoverings.button++;
        }
        for (const input of Input.items) {
            if (input.hovering) hoverings.input++;
        }

        if (frames - connectionMessage.shownAt >= connectionMessage.duration) connectionMessage.a = Math.max(connectionMessage.a - 0.05, 0);
        screenShake.update();

        water.x += Number(config.graphics.waterFlow ?? 0) * water.vx;
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
                water.flood.showMessage = false;
            }
        } else if (game && isInGame) water.flood.level = (water.flood.enabled) ? 0 : c.height() + game.floodLevel;
        else water.flood.level = (water.flood.enabled) ? 0 : c.height();
        if (frames === introLogo.duration) {
            water.flood.disable();
            audio.music.play();

            if (freeDiskSpace > 2) checkForUpdates();
            else cannotSaveReplayAlert();
        }

        if (frames - errorAlert.shownAt >= errorAlert.duration && errorAlert.visible) errorAlert.visible = false;
        if (errorAlert.visible) errorAlert.y = Math.min(50, errorAlert.y + errorAlert.vy);
        else errorAlert.y = Math.max(-100, errorAlert.y - errorAlert.vy);

        if (frames - gamepadAlert.shownAt >= gamepadAlert.duration && gamepadAlert.visible) gamepadAlert.visible = false;
        if (gamepadAlert.visible) gamepadAlert.x = Math.min(-20, gamepadAlert.x + gamepadAlert.vx);
        else gamepadAlert.x = Math.max(-gamepadAlert.width, gamepadAlert.x - gamepadAlert.vx);

        if (isInGame) {
            // everything audio
            const explosions = {
                now: game.rockets.filter(r => r.explosion.active && r.x > -r.explosion.size / 2 && r.x < c.width() + r.explosion.size / 2).length,
                then: lgame.rockets.filter(r => r.explosion.active && r.x > -r.explosion.size / 2 && r.x < c.width() + r.explosion.size / 2).length
            };
            const forceFields = {
                now: game.players.filter(p => p && p.powerup.active && p.powerup.selected === Player.powerup.FORCE_FIELD).length,
                then: lgame.players.filter(p => p && p.powerup.active && p.powerup.selected === Player.powerup.FORCE_FIELD).length
            };
            const lives = {
                now: game.players.filter(p => p).map(p => p.lives),
                then: lgame.players.filter(p => p).map(p => p.lives)
            };
            const exclusives = {
                now: game.players.filter(p => p && p.exclusivePlatform).length,
                then: lgame.players.filter(p => p && p.exclusivePlatform).length
            };
            const squashes = {
                now: game.circles.filter(c => c.color === theme.colors.squash).length,
                then: lgame.circles.filter(c => c.color === theme.colors.squash).length
            };

            if (game.attacks.length > lgame.attacks.length) audio._play(audio.attack);
            if (game.rockets.length > lgame.rockets.length) audio._play(audio.rocket);
            if (game.poopBombs.length > lgame.poopBombs.length) audio._play(audio.poopbomb);
            if (game.geysers.length > lgame.geysers.length) audio._play(audio.geyser);
            if (game.splashes.length > lgame.splashes.length) audio._play((theme.filters[theme.current]) ? audio.splash_2 : audio.splash);
            if (forceFields.now > forceFields.then) audio._play(audio.forcefield);
            if (explosions.now > explosions.then) audio._play(audio.explosion);
            if (exclusives.now > exclusives.then) audio._play(audio.exclusive);
            if (squashes.now > squashes.then) audio._play(audio.squash);
            if (game.fish.item && game.fish.item.y < 550 && lgame.fish.item && lgame.fish.item.y >= 550) audio._play(audio.fish);
            for (let i=0; i<lives.then.length; i++) {
                if (lives.now[i] > lives.then[i]) audio._play(audio.lifemender);
            }

        } else parallellogram.hide();
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

        lgame = (game) ? JSON.parse(JSON.stringify(game)) : undefined;
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
        } else if (theme.current === "foggy") {
            c.options.setOpacity(0.05);
            c.draw.fill.rect(c.options.pattern(image.stars), 0, 0, c.width(), c.height());
            c.options.setOpacity();
            c.draw.fill.rect(c.options.gradient(0, 0, 0, c.height(1.5), {pos: 0, color: "transparent"}, {pos: 1, color: theme.colors.text.light}), 0, 0, c.width(), c.height());
        }

        const drawWater = () => {
            if (theme.filters[theme.current]) c.options.filter.add(...theme.filters[theme.current]);

            c.draw.fill.rect(
                c.options.gradient(0, water.flood.level, 0, water.flood.level + c.height(),
                {pos: 0, color: theme.colors.ui.secondary}, {pos: 0.5, color: theme.colors.ui.primary}, {pos: 1, color: theme.colors.ui.secondary}),
                0,
                water.flood.level - 2,
                c.width(),
                c.height() + 2
            );
            if (water.flood.showMessage) c.draw.text({text: "Good luck, have fun!", x: c.width(0.5), y: water.flood.level + c.height(0.5), color: theme.colors.ui.secondary, font: {size: 100, style: "bold"}, baseline: "middle"});

            water.imageX = 0;
            while (water.imageX < c.width() + image.water.width) {
                c.draw.image(image.water, water.x + water.imageX, water.flood.level - image.water.height);
                water.imageX += image.water.width;
            }
            if (state.is(state.MAIN_MENU)) c.draw.text({text: `v${versions.game}`, x: 8 + state.change.x, y: water.flood.level - 15, color: theme.colors.ui.primary, font: {size: 26}, alignment: "left"});
            if (Replay.isSaving) c.draw.text({text: `Saving replay...`, x: c.width() - 8 - state.change.x, y: c.height() - 15, color: theme.colors.text.light, font: {size: 26, shadow: true}, alignment: "right"});

            if (theme.filters[theme.current]) c.options.filter.remove(...theme.filters[theme.current]);
        };

        if (state.isMenu()) {
            for (const sprite of MenuSprite.items) {
                if (sprite.visible) c.draw.croppedImage(image.sprites, sprite.color * 128, sprite.facing * 128, 128, 128, sprite.x, sprite.y, 96, 96);
            }
            drawWater();
        } else if (state.is(state.PLAYING_LOCAL, state.PLAYING_LAN, state.PLAYING_FREEPLAY, state.WATCHING_REPLAY, state.TUTORIAL_GAME) && game) {
            const offset = {x: (c.width() - image.platforms.width) / 2 + screenShake.x, y: c.height() - image.platforms.height + screenShake.y};

            if (theme.current === "foggy") c.options.filter.add("sepia(1)", "hue-rotate(150deg)", "brightness(1.5)");
            c.draw.image(image.platforms, offset.x, offset.y);
            c.options.filter.remove("sepia", "hue-rotate", "brightness");

            for (const p of game.players) {
                if (p === null) continue;

                if (p.exclusivePlatform) {
                    c.options.setOpacity(0.5);
                    c.options.setShadow(theme.colors.text.light, 18);
                    c.draw.fill.rect(theme.colors.players[p.index], p.exclusivePlatform.x + offset.x, p.exclusivePlatform.y + offset.y, Exclusive.width, Exclusive.height, 4);
                    c.options.setOpacity();
                    c.options.setShadow();
                }

                if (p.powerup.active && p.powerup.selected === Player.powerup.INVISIBILITY) c.options.setOpacity((playerIndex === p.index || state.current === state.WATCHING_REPLAY) ? 0.2 : 0);
                if (frames % 4 < 2 || game.ping - p.respawn >= p.spawnProtection) c.draw.croppedImage(image.sprites, p.index * 128, Number(p.facing === "l") * 128, 128, 128, p.x + offset.x, p.y + offset.y, p.size, p.size);
                c.options.setOpacity();

                if (playerIndex === p.index) c.draw.fill.triangleUD(theme.colors.ui.indicator, p.x + p.size / 2 + offset.x, p.y + offset.y - 32, 40, 20);

                const offScreen = {
                    x: Math.min(c.width() - p.size - 35, Math.max(25, p.x + offset.x)),
                    y: Math.min(c.height() - p.size - 35, Math.max(25, p.y + offset.y)),
                    triangleX: Math.min(c.width() - p.size - 15, Math.max(5, p.x + offset.x)),
                    triangleY: Math.min(c.height() - p.size - 15, Math.max(5, p.y + offset.y))
                };
                if (p.x + offset.x < -p.size && p.lives > 0 && p.connected) {
                    c.draw.fill.rect(theme.colors.players[p.index], 25, offScreen.y - 10, p.size + 20, p.size + 20, 8);
                    c.draw.fill.triangleLR(theme.colors.players[p.index], 25, offScreen.triangleY + p.size / 2, -20, 30);
                    c.draw.croppedImage(image.sprites, p.index * 128, Number(p.facing === "l") * 128, 128, 128, 35, offScreen.y, p.size, p.size);
                } else if (p.x + offset.x > c.width() && p.lives > 0 && p.connected) {
                    c.draw.fill.rect(theme.colors.players[p.index], c.width() - p.size - 45, offScreen.y - 10, p.size + 20, p.size + 20, 8);
                    c.draw.fill.triangleLR(theme.colors.players[p.index], c.width() - 25, offScreen.triangleY + p.size / 2, 20, 30);
                    c.draw.croppedImage(image.sprites, p.index * 128, Number(p.facing === "l") * 128, 128, 128, c.width() - p.size - 35, offScreen.y, p.size, p.size);
                } else if (p.y + offset.y < -p.size && p.lives > 0 && p.connected && state.current !== state.TUTORIAL_GAME) {
                    c.draw.fill.rect(theme.colors.players[p.index], offScreen.x - 10, 25, p.size + 20, p.size + 20, 8);
                    c.draw.fill.triangleUD(theme.colors.players[p.index], offScreen.triangleX + p.size / 2, 25, 30, -20);
                    c.draw.croppedImage(image.sprites, p.index * 128, Number(p.facing === "l") * 128, 128, 128, offScreen.x, 35, p.size, p.size);
                }
            }
            if (theme.isDark()) c.options.setShadow(theme.colors.shadow, 2);
            for (const p of game.players) {
                if (p === null) continue;

                if (p.powerup.active && p.powerup.selected === Player.powerup.FORCE_FIELD) {
                    c.options.setShadow(theme.colors.shadow, 7);
                    c.draw.stroke.arc(theme.colors.text.light, p.x + offset.x + p.size / 2, p.y + offset.y + p.size / 2, Math.sqrt(p.size ** 2 * 2) / 2);
                    c.options.setShadow();
                }
                if (p.powerup.active && p.powerup.selected === Player.powerup.INVISIBILITY) c.options.setOpacity((playerIndex === p.index) ? 0.2 : 0);
                c.draw.text({text: p.name, x: p.x + p.size / 2 + offset.x, y: p.y + offset.y - (playerIndex === p.index ? 42 : 10), font: {size: 20}});
                c.options.setOpacity();
            }
            c.options.setShadow();

            for (const g of game.geysers) {
                const grd = c.options.gradient(g.x, 0, g.x + Geyser.width, 0, {pos: 0, color: theme.colors.ui.primary}, {pos: 0.5, color: theme.colors.ui.secondary}, {pos: 1, color: theme.colors.ui.primary});
                c.options.setOpacity(g.a);

                if (theme.filters[theme.current]) c.options.filter.add(...theme.filters[theme.current]);
                c.draw.fill.rect(grd, g.x + offset.x, g.y, Geyser.width, Math.abs(g.y) + c.height(2), Geyser.width / 4);
                if (theme.filters[theme.current]) c.options.filter.remove(...theme.filters[theme.current]);
            }
            for (const ci of game.circles) {
                c.options.setOpacity(ci.a);
                if (ci.lineWidth > -1) c.draw.stroke.arc(ci.color, ci.x + offset.x, ci.y + offset.y, ci.r, ci.lineWidth);
                else c.draw.fill.circle(ci.color, ci.x + offset.x, ci.y + offset.y, ci.r);
            }
            c.options.setOpacity();

            for (const r of game.rockets) {
                if (r.explosion.active) {
                    c.options.setOpacity(r.explosion.a);
                    c.draw.image(image.explosion, r.x - r.explosion.size / 2 + offset.x, r.y - r.explosion.size / 2 + offset.y, r.explosion.size, r.explosion.size);
                    c.options.setOpacity();
                } else c.draw.line(theme.getTextColor(), r.x + offset.x, r.y + offset.y, r.x + r.width + offset.x, r.y + offset.y, 9);
            }
            drawWater();

            for (const s of game.splashes) {
                c.options.setOpacity(s.a);

                if (theme.filters[theme.current]) c.options.filter.add(...theme.filters[theme.current]);
                c.draw.image(image.splash, s.x - image.splash.width / 2 + offset.x, offset.y + 560 + s.h);
                if (theme.filters[theme.current]) c.options.filter.remove(...theme.filters[theme.current]);
            }
            c.options.setOpacity();

            for (const pb of game.poopBombs) {
                c.draw.image(image.poopbomb, pb.x - image.poopbomb.width / 2 + offset.x, pb.y - image.poopbomb.height / 2 + offset.y);
            }

            if (game.fish.item) {
                c.options.setOpacity(game.fish.item.takeable ? 1 : 0.35);
                c.options.setShadow(theme.colors.text.light, 15);
                c.draw.image(image.fish, game.fish.item.x + offset.x, game.fish.item.y + offset.y, Fish.width, Fish.height);
                if (game.fish.item.takeable && game.fish.item.takeValue > 0) c.draw.stroke.arc(
                    theme.colors.players[game.fish.item.takenBy],
                    game.fish.item.x + Fish.width / 2 + offset.x,
                    game.fish.item.y + Fish.height / 2 + offset.y,
                    Fish.width / 2,
                    12,
                    game.fish.item.takeValue
                );
            }
            c.options.setOpacity();
            c.options.setShadow();

            const parallellogramWidth = Math.min(350, Math.max(150, (c.width() - 150) / game.startPlayerCount));
            const spacing = (c.width() - game.startPlayerCount * parallellogramWidth) / game.startPlayerCount;
            let i = 0;
            for (const p of game.players) {
                if (p === null) continue;

                const x = spacing / 2 + i * (parallellogramWidth + spacing) + screenShake.x;
                const y = parallellogram.y + screenShake.y;
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
                const r = Math.min(Math.max(160, 255 - (p.hit.percentage - 125)), 255);
                const g = Math.min(Math.max(0, 255 - p.hit.percentage * 2.5), 255);
                const b = Math.min(Math.max(0, 255 - p.hit.percentage * 5), 255);
                const shake = (game.ping - p.hit.last < p.hit.effectDuration) ? {x: (Math.random() - 0.5) * screenShake.intensity, y: (Math.random() - 0.5) * screenShake.intensity} : {x: 0, y: 0};
                const color = (game.ping - p.hit.last < p.hit.effectDuration) ? `hsl(${Math.random() * 360}deg 100% 70%)` : `rgb(${r}, ${g}, ${b})`;
                const decimalOffset = c.draw.text({text: Math.floor(p.hit.percentage), font: {size: 48, style: "bold"}, measure: true});
                const decimalText = (parallellogramWidth > 250) ? p.hit.percentage.toFixed(1).slice(-2) + "%" : "%";

                const shadowColor = (frames % 30 < 20 && p.powerup.available && p.powerup.meetsCondition) ? theme.colors.text.light
                 : (frames % 30 < 20 && p.powerup.available) ? theme.colors.error.foreground
                 : (frames % 30 < 20 && p.powerup.active) ? theme.colors.ui.highlight
                 : theme.colors.shadow;
                const shadowBlur = (shadowColor === theme.colors.shadow) ? 4 : 12;
                c.options.setShadow(shadowColor, shadowBlur);

                if (p.lives < 1 || !p.connected) c.options.setOpacity(0.3);
                c.draw.fill.parallellogram(theme.colors.players[p.index], x, y, parallellogramWidth, 95);
                c.draw.croppedImage(image.sprites, p.index * 128, 0, 128, 128, x + offsets.sprite, y - 10, 72, 72);
                c.options.filter.remove("brightness");

                c.options.setShadow(theme.colors.shadow, 2);
                for (let l=0; l<p.lives; l++) c.draw.croppedImage(image.sprites, p.index * 128, 0, 128, 128, x + offsets.lives + l * 20, y - 19, 16, 16);
                c.options.setShadow(theme.colors.shadow, 3, 1, 1);
                c.draw.text({text: p.name, x: x + 11, y: y + 85, color: theme.colors.text.light, font: {size: nameSize}, alignment: "left", maxWidth: parallellogramWidth - 35});
                if (p.lives >= 1 && p.connected) {
                    c.draw.text({text: Math.floor(p.hit.percentage), x: x + offsets.percentage + shake.x, y: y + shake.y + 64, color, font: {size: 54, style: "bold"}, alignment: "left", baseline: "bottom"});
                    c.draw.text({text: decimalText, x: x + decimalOffset + offsets.percentage + shake.x + 4, y: y + shake.y + 57, color, font: {size: 20, style: "bold"}, alignment: "left", baseline: "bottom"});

                    c.options.setShadow();
                    c.draw.image(image.explosion, x + parallellogramWidth - offsets.rockets - 12, y + 5, 24, 24);
                    c.options.setShadow(theme.colors.shadow, 2);

                    if (frames % 4 < 2 || [0, null, Infinity].includes(p.attacks.rocket.count) || game.ping - p.attacks.rocket.lastPerformed >= p.attacks.rocket.cooldown) c.draw.text({
                        text: infiniteRocketCount(p.attacks.rocket.count) ? "∞" : p.attacks.rocket.count,
                        x: x + parallellogramWidth - offsets.rockets,
                        y: y + 18,
                        color: (p.attacks.rocket.count === 0) ? theme.colors.error.foreground : theme.colors.text.light,
                        font: {size: 18},
                        baseline: "middle"
                    });
                    if (game.startState >= 6 && p.attacks.rocket.count < Player.maxRockets && !infiniteRocketCount(p.attacks.rocket.count)) c.draw.stroke.arc(theme.colors.text.light, x + parallellogramWidth - offsets.rockets, y + 17, 13, 2, (game.ping - p.attacks.rocket.lastRegenerated) / p.attacks.rocket.regenerationInterval);
                }
                c.options.setShadow();
                c.options.setOpacity();
                if (!p.connected) c.draw.image(image.disconnected, x + (parallellogramWidth - 115) / 2, y - 10, 115, 115);
                else if (p.lives < 1) c.draw.image(image.eliminated, x + (parallellogramWidth - 115) / 2, y - 10, 115, 115);
                else if (shadowColor === theme.colors.text.light) {
                    c.options.setOpacity(0.8);
                    c.draw.text({text: "POWER-UP", x: x + parallellogramWidth / 2, y: y + 40, color: theme.colors.text.light, font: {size: 30, style: "bold"}, maxWidth: parallellogramWidth - 35});
                    c.draw.text({text: "AVAILABLE", x: x + parallellogramWidth / 2, y: y + 70, color: theme.colors.text.light, font: {size: 30, style: "bold"}, maxWidth: parallellogramWidth - 35});
                } else if (shadowColor === theme.colors.error.foreground) {
                    c.options.setOpacity(0.8);
                    c.draw.text({text: "CONDITION", x: x + parallellogramWidth / 2, y: y + 40, color: theme.colors.error.foreground, font: {size: 30, style: "bold"}, maxWidth: parallellogramWidth - 35});
                    c.draw.text({text: "NOT MET", x: x + parallellogramWidth / 2, y: y + 70, color: theme.colors.error.foreground, font: {size: 30, style: "bold"}, maxWidth: parallellogramWidth - 35});
                } else if (shadowColor === theme.colors.ui.highlight) {
                    c.options.setOpacity(0.8);
                    const remaining = ((p.powerup.lastActivated + Game.powerups[p.powerup.selected].duration - game.ping) / 1000).toFixed(1);
                    if (!isNaN(remaining)) c.draw.text({text: remaining, x: x + parallellogramWidth / 2, y: y + 65, color: theme.colors.ui.highlight, font: {size: 58, style: "bold"}, maxWidth: parallellogramWidth - 35});
                }
                c.options.setOpacity();
                
                i++;
            }

            const m = Math.max(0, Math.floor(game.remaining / 60));
            const s = ("0" + Math.max(0, game.remaining % 60)).slice(-2);
            const liquid = (theme.current === "slime") ? "Slime" : (theme.current === "lava") ? "Lava" : "Water";
            const text = (state.current === state.TUTORIAL_GAME) ? ""
             : (game.winner !== null) ? `Returning to menu in ${m}:${s}`
             : (game.remaining >= 0) ? `${liquid} starts rising in ${m}:${s}`
             : (!game.flooded) ? `${liquid} is rising!`
             : (state.is(state.PLAYING_FREEPLAY) && game.players.filter(p => p && p.lives > 0).length === 1 && game.players[playerIndex].lives > 0) ? "Congratulations!"
             : "Fight to the victory!";
            const color = (game.remaining < 0 && game.winner === null && !game.flooded && frames % 60 < 30) ? theme.colors.error.foreground : theme.getTextColor();

            if (state.current === state.WATCHING_REPLAY && replay) {
                const replayInformation = `Frame ${replay.frameIndex} / ${replay.frames.length - 1} (${(replay.frameIndex / (replay.frames.length - 1) * 100).toFixed(0)}%)`;
                c.draw.text({text: replayInformation, x: 100, y: 45, font: {size: 28}, alignment: "left"});
                c.draw.text({text, x: 100, y: 75, color, font: {size: 20, style: "italic"}, alignment: "left"});
            } else c.draw.text({text, x: 15 + screenShake.x, y: 35 + screenShake.y, color, font: {size: 28}, alignment: "left"});

            if (state.current === state.PLAYING_LAN) c.draw.text({text: `Ping: ${Math.max(0, ping)} ms`, x: c.width() - 15, y: 25, font: {size: 12}, alignment: "right"});
            else if (state.current === state.WATCHING_REPLAY && replay) c.draw.text({text: `${replay.playbackRate}x`, x: c.width() - 525, y: 60, font: {size: 32, style: "bold", shadow: true}});
        } else drawWater();

        if (state.is(state.MAIN_MENU, state.ABOUT, state.TUTORIAL_PROMPT)) {
            if (theme.isDark()) {
                c.options.filter.add("brightness(100)");
                c.options.setShadow(theme.colors.shadow, 4, 1, 1);
            }
            c.draw.image(image.logo, c.width(0.5) - image.logo.width / 2 + state.change.x, 25, image.logo.width, image.logo.height);
            c.options.filter.remove("brightness");
            c.options.setShadow();
        }
        
        if (state.current === state.PLAY_MENU) {
            c.draw.text({text: "PLAY GAME", x: c.width(0.5) + state.change.x, y: 80, font: {size: 58, style: "bold", shadow: true}});

            c.draw.text({text: "APPEARANCE", x: c.width(0.3) + state.change.x, y: 180, font: {size: 32, style: "bold", shadow: true}});
            c.draw.text({text: "GAME MODES", x: c.width(0.7) + state.change.x, y: 180, font: {size: 32, style: "bold", shadow: true}});
            c.draw.text({text: "Player name:", x: c.width(0.3) - Button.width / 2 - 25 + state.change.x, y: 250, font: {size: 24, shadow: true}, alignment: "left"});
            c.draw.text({text: "Preferred color:", x: c.width(0.3) - Button.width / 2 - 25 + state.change.x, y: 345, font: {size: 24, shadow: true}, alignment: "left"});
            c.draw.text({text: "Power-up:", x: c.width(0.3) - Button.width / 2 - 25 + state.change.x, y: 525, font: {size: 24, shadow: true}, alignment: "left"});
            
            const colors = ["Yellow", "Green", "Red", "Blue", "Orange", "Cyan", "Purple", "Gray"];
            const powerups = Game.powerups.map(p => p.name);
            c.draw.croppedImage(image.sprites, config.appearance.preferredColor * 128, 0, 128, 128, c.width(0.3) - 35 + state.change.x, 370, 70, 70);
            c.draw.croppedImage(image.powerups, 0, config.appearance.powerup * 70, 140, 70, c.width(0.3) - 70 + state.change.x, 550, 140, 70);
            c.draw.text({text: colors[config.appearance.preferredColor], x: c.width(0.3) + state.change.x, y: 470, font: {size: 30, style: "bold", shadow: true}, baseline: "middle"});
            c.draw.text({text: powerups[config.appearance.powerup], x: c.width(0.3) + state.change.x, y: 650, font: {size: 30, style: "bold", shadow: true}, baseline: "middle", maxWidth: Button.width - 90});
            if (Game.powerups[config.appearance.powerup].conditionText)
                c.draw.text({text: Game.powerups[config.appearance.powerup].conditionText, x: c.width(0.3) + state.change.x, y: 690, font: {size: 16, shadow: true}, baseline: "middle"});
        } else if (state.current === state.WAITING_LOCAL && game) {
            c.draw.text({text: "LOCAL MODE", x: c.width(0.5) + state.change.x, y: 80, font: {size: 58, style: "bold", shadow: true}});
            c.draw.text({text: "Connect up to 4 controllers to play!", x: c.width(0.5) + state.change.x, y: c.height(0.125) + 30, font: {size: 18, shadow: true}});
            for (let i=0; i<gamepad.playerIndexes.length; i++) {
                const x = c.width(0.5) - 400;
                const y = c.height(0.2) + i * 100;
                const j = gamepad.playerIndexes[i];

                if (!game.players[j].connected) c.options.setOpacity(0.5);
                c.draw.fill.rect(theme.colors.players[j], x + state.change.x, y, 500, 80, 8);
                c.draw.croppedImage(image.sprites, j * 128, Number(game.players[j].facing === "l") * 128, 128, 128, x + 8 + state.change.x, y + 8, 64, 64);
                if (game.players[j].connected) {
                    c.options.setShadow(theme.colors.shadow, 4, 1, 1);
                    c.draw.text({text: game.players[j].name, x: x + state.change.x + 85, y: y + 52, font: {size: 32}, color: theme.colors.text.light, alignment: "left"});
                } else c.options.filter.add("grayscale(1)");
                c.draw.croppedImage(image.powerups, 0, game.players[j].powerup.selected * 70, 140, 70, x + state.change.x + 595, y, 140, 70);
                c.options.filter.remove("grayscale");
                c.options.setShadow();
                c.options.setOpacity();
            }
        } else if (state.current === state.LAN_GAME_MENU) {
            c.draw.text({text: "LAN MODE", x: c.width(0.5) + state.change.x, y: 80, font: {size: 58, style: "bold", shadow: true}});

            c.draw.text({text: "...or join a game on this network:", x: c.width(0.5) + state.change.x, y: c.height(0.5) - 50, font: {size: 32, style: "bold", shadow: true}});
            c.draw.text({text: "IP address:", x: c.width(0.5) - 230 + state.change.x, y: c.height(0.5) + 60, font: {size: 24, shadow: true}, alignment: "left"});
            c.options.setOpacity(connectionMessage.a);
            c.draw.text({text: connectionMessage.text, x: c.width(0.5) + state.change.x, y: c.height(0.5) + Button.height + 180, color: connectionMessage.color ?? theme.getTextColor(), font: {size: 30, style: "bold", shadow: true}});
            c.options.setOpacity();
            for (let i=0; i<3; i++)
                c.draw.text({text: ".", x: c.width(0.5) - 125 + state.change.x + i * 120, y: c.height(0.5) + 120, font: {size: 40, shadow: true}, alignment: "left"});
        } else if (state.current === state.SETTINGS) {
            c.draw.text({text: "SETTINGS", x: c.width(0.5) + state.change.x, y: 80, font: {size: 58, style: "bold", shadow: true}});

            c.draw.text({text: "GRAPHICS", x: c.width(0.3) + state.change.x, y: 180, font: {size: 32, style: "bold", shadow: true}});
            c.draw.text({text: "CONTROLS", x: c.width(0.7) + state.change.x, y: 180, font: {size: 32, style: "bold", shadow: true}});
            
            const keybinds = ["Move left", "Move right", "Jump", "Attack", "Launch rocket", "Activate power-up", "Game menu"];
            for (let i=0; i<keybinds.length; i++)
                c.draw.text({text: keybinds[i], x: c.width(0.7) - Button.width / 2 - 25 + state.change.x, y: 250 + i * 60, font: {size: 24, shadow: true}, alignment: "left"});
        } else if (state.current === state.ABOUT) {
            c.draw.text({text: "by", x: c.width(0.5) + state.change.x, y: c.height(0.37) - 10, font: {size: 24, style: "bold", shadow: true}, baseline: "bottom"});
            c.draw.image(image.logo_nmgames, c.width(0.5) - image.logo_nmgames.width / 4 + state.change.x, c.height(0.37), image.logo_nmgames.width / 2, image.logo_nmgames.height / 2);
            c.draw.text({text: `Version ${versions.game}`, x: c.width(0.5) + state.change.x, y: c.height(0.5) + 50, font: {size: 36, style: "bold", shadow: true}, baseline: "bottom"});
            c.draw.text({text: versions.status, x: c.width(0.5) + state.change.x, y: c.height(0.5) + 70, font: {size: 18, shadow: true}, baseline: "bottom"});
            c.draw.text({text: `Powered by Electron ${versions.electron} and Chromium ${versions.chromium}`, x: c.width(0.5) + state.change.x, y: c.height(0.5) + 110, font: {size: 18, shadow: true}, baseline: "bottom"});
            c.draw.text({text: `This program is free and open-source software: you are free to modify and/or redistribute it.`, x: c.width(0.5) + state.change.x, y: c.height(0.7), font: {size: 20, shadow: true}, baseline: "bottom"});
            c.draw.text({text: `There is NO WARRANTY, to the extent permitted by law.`, x: c.width(0.5) + state.change.x, y: c.height(0.7) + 25, font: {size: 20, shadow: true}, baseline: "bottom"});
            c.draw.text({text: `Read the GNU General Public License version 3 for further details.`, x: c.width(0.5) + state.change.x, y: c.height(0.7) + 50, font: {size: 20, shadow: true}, baseline: "bottom"});
        } else if (state.current === state.STATISTICS) {
            c.draw.text({text: "STATISTICS", x: c.width(0.5) + state.change.x, y: 80, font: {size: 58, style: "bold", shadow: true}});

            c.draw.text({text: "MATCHES PLAYED", x: c.width(0.3) + state.change.x, y: 180, font: {size: 32, style: "bold", shadow: true}});
            c.draw.text({text: "OTHER STATISTICS", x: c.width(0.7) + state.change.x, y: 180, font: {size: 32, style: "bold", shadow: true}});

            let i;
            let total = 0;
            for (i=0; i<statistics.gamesPlayed.length; i++) {
                c.draw.croppedImage(image.sprites, i * 128, 0, 128, 128, c.width(0.3) - 100 + state.change.x, 220 + i * 60, 48, 48);
                c.draw.text({text: statistics.gamesPlayed[i], x: c.width(0.3) - 35 + state.change.x, y: 258 + i * 60, font: {size: 40, shadow: true}, alignment: "left"});
                total += statistics.gamesPlayed[i];
            }
            c.draw.text({text: `Total: ${total}`, x: c.width(0.3) + state.change.x, y: 258 + i * 60, font: {size: 32, shadow: true}});

            const statProperties = {
                traveledX: {label: "X distance traveled", format: "* px", fix: 1},
                traveledY: {label: "Y distance traveled", format: "* px", fix: 1},
                meleeAttacks: {label: "Melee attacks performed", format: "*", fix: 0},
                rocketsFired: {label: "Rockets fired", format: "*", fix: 0},
                fishCollected: {label: "Fish collected", format: "*", fix: 0},
                damageTaken: {label: "Damage taken", format: "*%", fix: 1},
                timesSplashed: {label: "Times splashed", format: "*", fix: 0}
            };
            for (i=0; i<Object.keys(statProperties).length; i++) {
                const stat = Object.keys(statProperties)[i];
                c.draw.text({text: statProperties[stat].label, x: c.width(0.7) - 225 + state.change.x, y: 260 + i * 30, font: {size: 22, style: "bold", shadow: true}, alignment: "left"});
                c.draw.text({text: statProperties[stat].format.replace(/^\*(.*)$/, statistics[stat].toFixed(statProperties[stat].fix) + "$1"), x: c.width(0.7) + 225 + state.change.x, y: 260 + i * 30, font: {size: 22, shadow: true}, alignment: "right"});
            }
        } else if (state.current === state.REPLAYS_MENU) {
            c.draw.text({text: "REPLAYS", x: c.width(0.5) + state.change.x, y: 80, font: {size: 58, style: "bold", shadow: true}});
            c.draw.text({text: "Look back at the games you played!", x: c.width(0.5) + state.change.x, y: c.height(0.125) + 30, font: {size: 18, shadow: true}});
            c.draw.text({text: "WARNING: replays take up a lot of disk space, so only the last 5 games are saved.", x: c.width(0.5) + state.change.x, y: c.height(0.125) + 55, font: {size: 18, shadow: true}});
            for (let i=0; i<5; i++) {
                if (Replay.list[i]) {
                    const title = Replay.list[i].name.slice(0, Replay.list[i].name.lastIndexOf("."));
                    const subtitle = `Size: ${(Replay.list[i].size / 1e6).toFixed(1)} MB`;
                    c.draw.text({text: title, x: c.width(1/2) - 580 + state.change.x, y: c.height(1/2) - 40 + i * 80, alignment: "left", font: {size: 36, style: "bold", shadow: true}});
                    c.draw.text({text: subtitle, x: c.width(1/2) - 580 + state.change.x, y: c.height(1/2) - 15 + i * 80, alignment: "left", font: {size: 18, shadow: true}});
                } else c.draw.text({text: "Empty", x: c.width(1/2) - 580 + state.change.x, y: c.height(1/2) - 30 + i * 80, alignment: "left", font: {size: 36, style: "italic", shadow: true}});
            } 
        } else if (state.current === state.TUTORIAL_PROMPT) {
            c.draw.text({text: "Welcome to Super Splash Bros 2!", x: c.width(0.5) + state.change.x, y: 350, font: {size: 58, style: "bold", shadow: true}});
            c.draw.text({text: "Would you like to follow a brief tutorial of this game?", x: c.width(0.5) + state.change.x, y: c.height(0.125) + 330, font: {size: 36, style: "bold", shadow: true}});
        } else if (state.current === state.TUTORIAL_INTRO) {
            c.draw.text({text: "In this game, you compete against up to 7 other players", x: c.width(0.5) + state.change.x, y: 100, font: {size: 30, style: "bold", shadow: true}});
            c.draw.text({text: "on a few platforms above water. Your goal is to get the other players", x: c.width(0.5) + state.change.x, y: 140, font: {size: 30, style: "bold", shadow: true}});
            c.draw.text({text: "into the water, make them lose their lives, and be the last one standing.", x: c.width(0.5) + state.change.x, y: 180, font: {size: 30, style: "bold", shadow: true}});

            c.draw.text({text: "You can play in several gamemodes: Local (up to 4 players with controllers on 1 device),", x: c.width(0.5) + state.change.x, y: 240, font: {size: 30, style: "bold", shadow: true}});
            c.draw.text({text: "LAN (up to 8 players on 8 devices) and Freeplay (1 player against up to 7 dummies).", x: c.width(0.5) + state.change.x, y: 280, font: {size: 30, style: "bold", shadow: true}});

            c.draw.text({text: "To take out your opponents, you have several attack methods:", x: c.width(0.5) + state.change.x, y: 340, font: {size: 30, style: "bold", shadow: true}});
            c.draw.text({text: "ordinary melee attacks, rockets and power-ups.", x: c.width(0.5) + state.change.x, y: 380, font: {size: 30, style: "bold", shadow: true}});

            c.draw.text({text: "Let's practice a little bit by entering a special tutorial game!", x: c.width(0.5) + state.change.x, y: 440, font: {size: 30, style: "bold", shadow: true}});
        } else if (state.current === state.TUTORIAL_POST_GAME) {
            c.draw.text({text: "You have finished the tutorial game, but you can still practice", x: c.width(0.5) + state.change.x, y: 100, font: {size: 30, style: "bold", shadow: true}});
            c.draw.text({text: "whenever you want to in a Freeplay game.", x: c.width(0.5) + state.change.x, y: 140, font: {size: 30, style: "bold", shadow: true}});

            c.draw.text({text: "Furthermore, you just practiced with the Squash power-up, but", x: c.width(0.5) + state.change.x, y: 200, font: {size: 30, style: "bold", shadow: true}});
            c.draw.text({text: "we got way more power-ups available. You should try those too!", x: c.width(0.5) + state.change.x, y: 240, font: {size: 30, style: "bold", shadow: true}});

            c.draw.text({text: "Want to know more about all the features of this game?", x: c.width(0.5) + state.change.x, y: 300, font: {size: 30, style: "bold", shadow: true}});
            c.draw.text({text: "On GitHub, there is a detailed explanation page available.", x: c.width(0.5) + state.change.x, y: 340, font: {size: 30, style: "bold", shadow: true}});
            c.draw.text({text: "You can always visit it easily by pressing your F1 key.", x: c.width(0.5) + state.change.x, y: 380, font: {size: 30, style: "bold", shadow: true}});

            c.draw.text({text: "Last, but not least: do not forget to change your name and player color!", x: c.width(0.5) + state.change.x, y: 440, font: {size: 30, style: "bold", shadow: true}});
            c.draw.text({text: "Have fun!", x: c.width(0.5) + state.change.x, y: 500, font: {size: 30, style: "bold", shadow: true}});
        } else if (state.current === state.TUTORIAL_GAME) {
            const texts = [
                `Move with [${Input.displayKeybind(config.controls.moveLeft)}] and [${Input.displayKeybind(config.controls.moveRight)}], jump with [${Input.displayKeybind(config.controls.jump)}]`,
                `Use [${Input.displayKeybind(config.controls.attack)}] to activate your attack`,
                `Use [${Input.displayKeybind(config.controls.launchRocket)}] to launch a rocket`,
                `Jump and use [${Input.displayKeybind(config.controls.activatePowerup)}] to activate your power-up`,
                "Well done! Let's move on with the tutorial."
            ];

            c.draw.text({text: texts[instance.tutorialPhase], x: c.width(0.5) + state.change.x, y: 60, font: {size: 42, style: "bold", shadow: true}});
        } else if (state.is(state.WAITING_LAN_GUEST, state.WAITING_LAN_HOST, state.WAITING_FREEPLAY) && game) {
            const ips = network.getIPs();
            const mainIP = ips.shift();
            if (state.current === state.WAITING_FREEPLAY) {
                c.draw.text({text: "FREEPLAY MODE", x: c.width(0.5) + state.change.x, y: 80, font: {size: 58, style: "bold", shadow: true}});
                c.draw.text({text: "Practice your skills! If you want, you can remove dummies.", x: c.width(0.5) + state.change.x, y: c.height(0.125) + 30, font: {size: 18, shadow: true}});
            } else {
                const text = (state.current === state.WAITING_LAN_GUEST) ? "Waiting until start..." : mainIP;
                c.draw.text({text, x: c.width(0.5) + state.change.x, y: c.height(0.125), font: {size: 58, style: "bold", shadow: true}});
                if (state.current === state.WAITING_LAN_GUEST) c.draw.text({text: `You have joined ${getEnteredIP().join(".")}`, x: c.width(0.5) + state.change.x, y: c.height(0.125) + 40, font: {size: 18, shadow: true}});
            }

            if (state.current === state.WAITING_LAN_HOST) {
                c.draw.text({text: "Players can now connect to this IP address:", x: c.width(0.5) + state.change.x, y: c.height(0.125) - 60, font: {size: 24, shadow: true}});
                if (ips.length > 0) c.draw.text({text: `If that does not work, try:   ${ips.join("   ")}`, x: c.width(0.5) + state.change.x, y: c.height(0.125) + 30, font: {size: 18, shadow: true}});
            }

            for (let i=0; i<8; i++) {
                const x = (i % 2 === 0) ? c.width(0.5) - 510 : c.width(0.5) + 10;
                const y = c.height(0.2) + Math.floor(i / 2) * 100;

                if (game.players[i] === null) c.options.setOpacity(0.5);
                c.draw.fill.rect(theme.colors.players[i], x + state.change.x, y, 500, 80, 8);
                c.draw.croppedImage(image.sprites, i * 128, 0, 128, 128, x + 8 + state.change.x, y + 8, 64, 64);
                if (i === banButton.hoverIndex) c.draw.stroke.rect(theme.colors.error[banButton.active ? "foreground":"background"], x + state.change.x, y, 500, 80, 4, 8);
                if (game.players[i] !== null) {
                    c.options.setShadow(theme.colors.shadow, 4, 1, 1);
                    let additionalText = false;
                    if (playerIndex === game.host || state.current === state.WAITING_FREEPLAY) {
                        additionalText = true;
                        const removalVerb = (state.current === state.WAITING_FREEPLAY) ? "remove" : "ban";
                        c.draw.text({text: (i === playerIndex) ? "you":`click to ${removalVerb}`, x: x + state.change.x + 85, y: y + 65, font: {size: 20}, color: theme.colors.text.light, alignment: "left"})
                    } else if (i === playerIndex) {
                        additionalText = true;
                        c.draw.text({text: "you", x: x + state.change.x + 85, y: y + 65, font: {size: 20}, color: theme.colors.text.light, alignment: "left"})
                    } else if (i === game.host) {
                        additionalText = true;
                        c.draw.text({text: "host", x: x + state.change.x + 85, y: y + 65, font: {size: 20}, color: theme.colors.text.light, alignment: "left"})
                    }
                    c.draw.text({text: game.players[i].name, x: x + state.change.x + 85, y: y + (additionalText ? 39 : 52), font: {size: 32}, color: theme.colors.text.light, alignment: "left"});
                }
                c.options.setShadow();
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

        if (water.flood.enabled || water.flood.disabling) drawWater();
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

        if (bigNotification.a > 0) {
            c.options.setOpacity(bigNotification.a);
            c.options.setShadow(bigNotification.color, 16, 1, 1);
            c.draw.text({
                text: bigNotification.text,
                x: c.width(0.5) + screenShake.x,
                y: c.height(0.4) + screenShake.y,
                font: {size: bigNotification.size, style: "bold"},
                baseline: "middle",
                maxWidth: c.width((bigNotification.size === bigNotification.defaultSize) ? 0.92 : 5)
            });
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

        c.options.filter.add("brightness(0.8)");
        c.draw.croppedImage(image.buttons, 0, 0, Button.initial.width, Button.initial.height, gamepadAlert.x, gamepadAlert.y, gamepadAlert.width, gamepadAlert.height);
        c.options.filter.remove("brightness");
        c.draw.text({text: "Connected controllers:", x: gamepadAlert.x + gamepadAlert.offset, y: gamepadAlert.y + 42, color: theme.colors.text.light, font: {size: 17}, alignment: "left"})
        for (let i=0; i<gamepad.playerIndexes.length; i++) {
            if (gamepad.get()[i] === null) c.options.setOpacity(0.25);
            c.draw.croppedImage(image.sprites, gamepad.playerIndexes[i] * 128, 0, 128, 128, gamepadAlert.x + i * 50 + gamepadAlert.offset, gamepadAlert.y + gamepadAlert.height - 65, 36, 36);
        }
        c.options.setOpacity();

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
