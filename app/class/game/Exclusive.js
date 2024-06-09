class Exclusive {
    static width = 120;
    static height = 20;
    
    x;
    y;

    /**
     * @constructor
     * @param {number} px
     * @param {number} py
     * @param {number} ps
     */
    constructor(px, py, ps) {
        this.x = px - (Exclusive.width - ps) / 2 - ps / 2;
        this.y = py + ps;
    }

    /** @param {import("./Player")} player */
    update(player) {
        if (player.x < this.x + Exclusive.width && player.x + player.size > this.x &&
         player.y < this.y + Exclusive.height && player.y + player.size > this.y) {
            if (player.lx + player.size <= this.x) {
                player.x = this.x - player.size;
                player.vx = 0;
            } else if (player.lx >= this.x + Exclusive.width) {
                player.x = this.x + Exclusive.width;
                player.vx = 0;
            } else if (this.y + Exclusive.height <= player.ly) {
                player.y = this.y + Exclusive.height;
                player.vy = 0;
            } else {
                player.y = this.y - player.size;
                player.vx = Math.min(3, player.vx / 1.14);
                player.jump.used = player.vy = 0;
                player.jump.active = false;
            }
        }
    }
}

module.exports = Exclusive;
