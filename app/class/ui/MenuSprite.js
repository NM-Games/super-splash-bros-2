const { height } = require("../../preload/canvas");

class MenuSprite {
    /** @type {MenuSprite[]} */
    static items = [];

    static generate() {
        let spriteX = 50;
        while (spriteX < 20000) {
            this.items.push(new MenuSprite(spriteX));
            spriteX += Math.random() * 100 + 200;
        }    
    }

    /** 
     * @param {number} frames
     * @param {boolean} enabled
     */
    static update(frames, enabled) {
        for (const sprite of this.items) {
            sprite.y = Math.sin((frames + sprite.offset) / 40) * sprite.amplitude + height();
            if (sprite.y > height()) {
                sprite.visible = enabled;
                sprite.type = Math.floor(Math.random() * 4);
                sprite.facing = Math.round(Math.random());
                sprite.setAmplitude();
            }
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
        this.type = Math.floor(Math.random() * 4);
        this.facing = Math.round(Math.random());
    }

    setAmplitude() {
        this.amplitude = Math.random() * 250 + 300;
    }
}

module.exports = MenuSprite;
