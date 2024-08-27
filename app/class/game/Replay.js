/**
 * @typedef {{
 *  version: string,
 *  theme: import("../../preload/theme").Themes,
 *  frames: object[]
 * }} ReplayContent
 * 
 * @typedef {{
 *  name: string,
 *  size: number,
 *  time: number
 * }} ReplayList
 */

const { ipcRenderer } = require("electron");

const { getButtonById } = require("../ui/Button");


class Replay {
    /** @type {ReplayList[]} */
    static list = [];

    theme;
    version;

    #isRecording;

    /**
     * Load or record a replay.
     * @param {string | undefined} name
     * @param {import("../../preload/index").EmptyCallback | undefined} onloaded
     */
    constructor(name, onloaded) {
        if (name) {
            this.#isRecording = false;
            this.name = name;
            this.playingFrame = 0;
            this.playbackRate = 1;
            this.paused = false;
            ipcRenderer.send("load-replay", name);
            ipcRenderer.once("replay-loaded", (_e, data) => {
                this.version = data.version;
                this.theme = data.theme;
                this.frames = data.frames;
                if (onloaded) onloaded();
            });

            addEventListener("keydown", (e) => {
                const key = e.key.toLowerCase();

                if (key === " ") this.togglePause();
                else if (key === "arrowleft") this.previousFrame();
                else if (key === "arrowright") this.nextFrame();
                else if (key === "arrowup") this.increasePlaybackRate();
                else if (key === "arrowdown") this.decreasePlaybackRate();
            });
        } else {
            this.#isRecording = true;
            this.name = new Intl.DateTimeFormat("nl", {dateStyle: "short", timeStyle: "medium"}).format().replace(/(,\s+|:)/g, "-");
            this.frames = [];
        }
    }

    update() {
        if (this.#isRecording) return;

        getButtonById("Replay-SaveScreenshot").disabled = !this.paused;
        getButtonById("Replay-SlowerRate").disabled = (this.playbackRate <= -3);
        getButtonById("Replay-FasterRate").disabled = (this.playbackRate >= 3);
        getButtonById("Replay-PrevFrame").disabled = (this.playingFrame <= 0 || !this.paused);
        getButtonById("Replay-NextFrame").disabled = (this.playingFrame >= this.frames.length - 1 || !this.paused);

        if (this.paused) return;

        this.playingFrame += Math.round(this.playbackRate);
        if (this.playingFrame <= 0) {
            this.paused = true;
            this.playingFrame = 0;
            if (this.playbackRate < 0) this.playbackRate = 1;
        } else if (this.playingFrame >= this.frames.length - 1) {
            this.playingFrame = this.frames.length - 1;
            this.paused = true;
        }
    }

    togglePause() {
        if (this.#isRecording) return;

        if (this.playingFrame === this.frames.length - 1) this.playingFrame = 0;
        this.paused = !this.paused;
    }
    previousFrame() {
        if (this.#isRecording || !this.paused) return;
        this.playingFrame = Math.max(0, this.playingFrame - 1);
    }
    nextFrame() {
        if (this.#isRecording || !this.paused) return;
        this.playingFrame = Math.min(this.frames.length - 1, this.playingFrame + 1);
    }

    increasePlaybackRate() {
        this.playbackRate++;
        if (this.playbackRate === 0) this.playbackRate++;
        if (this.playbackRate >= 3) this.playbackRate = 3;
    }
    decreasePlaybackRate() {
        this.playbackRate--;
        if (this.playbackRate === 0) this.playbackRate--;
        if (this.playbackRate <= -3) this.playbackRate = -3;
    }

    recordFrame(frame) {
        const data = JSON.parse(JSON.stringify(frame));

        if (!this.#isRecording) return;
        if (data.act) delete data.act;
        if (data.banCount) delete data.banCount;
        if (data.connected) delete data.connected;
        if (data.host) delete data.host;
        if (data.version) {
            if (!this.version) this.version = data.version;
            delete data.version;
        }
        if (data.theme) {
            if (!this.theme) this.theme = data.theme;
            delete data.theme;
        }
        if (data.players) {
            for (const p of data.players) {
                if (p) delete p.keys;
            }
        }

        this.frames.push(data);
    }
    
    save() {
        if (!this.#isRecording) return;
        ipcRenderer.send("save-replay", this.name, {
            version: this.version,
            theme: this.theme,
            frames: this.frames
        });
    }
}

module.exports = Replay;
