const { powerup } = require("./Player");

class Attack {
    static maxSize = 100;
    static impact = 3;

    player;
    x;
    y;
    a;
    size;

    /**
     * @constructor
     * @param {number} index
     * @param {number} x
     * @param {number} y
     */
    constructor(index, x, y) {
        this.player = index;
        this.x = x;
        this.y = y;
        this.size = 0;
    }

    /**
     * Update the melee attack.
     * @param {import("./Game")} instance
     * @returns {boolean} - `false` when the melee attack should be deleted, `true` otherwise.
     */
    update(instance) {
        if (this.size < Attack.maxSize) this.size += 5; else {
            for (const p of instance.getPlayers()) {
                if (p.index === this.player) continue;

                const px = p.x + p.size / 2;
                const py = p.y + p.size / 2;
                const distance = Math.sqrt(Math.abs(px - this.x) ** 2 + Math.abs(py - this.y) ** 2);
                
                if (distance <= p.size / 2 + this.size) {
                    let impact = (this.x - (p.x + p.size / 2) < 0 ? Attack.impact : -Attack.impact);
                    if (instance.players[this.player].hasPowerup(powerup.KNOCKBACK)) impact *= 3;

                    if (p.hasPowerup(powerup.FORCE_FIELD)) instance.players[this.player].damage(instance.ping, 2, 5, -impact);
                    else p.damage(instance.ping, 2, 5, impact);
                }
            }
            return false;
        }
        
        return true;
    }
}

module.exports = Attack;
