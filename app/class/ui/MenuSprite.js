const { height } = require("../../preload/canvas");

class MenuSprite {
    /** @type {MenuSprite[]} */
    static items = [];

    /**
     * Generate menu sprites in the background for the entire screen width.
     * @param {number} until
     */
    static generate(until) {
        let spriteX = 50;
        while (spriteX < until) {
            this.items.push(new MenuSprite(spriteX));
            spriteX += Math.random() * 100 + 200;
        }
    }

    /**
     * @param {number} frames
     * @param {boolean} enabled
     * @param {boolean} alwaysChange
     */
    static update(frames, enabled, alwaysChange) {
        for (const sprite of this.items) {
            sprite.y = Math.sin((frames + sprite.offset) / 40) * sprite.amplitude + height();
            if (sprite.y > height()) {
                sprite.visible = enabled;
                sprite.color = Math.floor(Math.random() * 8);
                sprite.facing = Math.round(Math.random());
                sprite.setAmplitude();
            } else if (alwaysChange && frames % 3 === 0) sprite.color = Math.floor(Math.random() * 8);
        }
    }

    x;
    y;
    visible;
    amplitude;
    offset;
    color;
    facing;

    /**
     * @constructor
     * @param {number} x
     */
    constructor(x) {
        this.x = x;
        this.y = height();
        this.visible = false;
        this.setAmplitude();
        this.offset = Math.floor(Math.random() * 600);
        this.color = Math.floor(Math.random() * 8);
        this.facing = Math.round(Math.random());
    }

    setAmplitude() {
        this.amplitude = Math.random() * 250 + 300;
    }
}

module.exports = MenuSprite;
