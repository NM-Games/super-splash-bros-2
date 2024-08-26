/**
 * @typedef {{
 *  name: string,
 *  version: string,
 *  theme: import("../../preload/theme").Themes,
 *  frames: object[]
 * }} ReplayContent
 */

const { ipcRenderer } = require("electron");

class Replay {
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
            ipcRenderer.send("load-replay", name);
            ipcRenderer.once("replay-loaded", (_e, frames) => {
                this.frames = frames;
                if (onloaded) onloaded();
            });
        } else {
            this.#isRecording = true;
            this.name = new Intl.DateTimeFormat("nl", {dateStyle: "short", timeStyle: "medium"}).format().replace(/(,\s+|:)/g, "-");
            this.frames = [];
        }
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
            for (const p of data.players) delete p.keys;
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
