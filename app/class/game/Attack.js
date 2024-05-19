class Attack {
    static maxSize = 100;
    static impact = 3;

    player;
    x;
    y;
    a;
    size;
    #grown;
    #damaged;

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
        this.a = 1;
        this.size = 0;
        this.border = 0;
        this.#grown = false;
        this.#damaged = false;
    }

    /**
     * Update the melee attack.
     * @returns {boolean} - `false` when the melee attack should be deleted.
     */
    update() {
        this.border += 12;

        if (this.size < Attack.maxSize) this.size += 5;
        else this.#grown = true;
        
        if (this.a > 0) this.a = Math.max(0, this.a - 0.02);
        else return false;

        return true;
    }

    /**
     * Check whether the attack should deal damage
     * @returns {boolean}
     */
    canDealDamage() {
        if (this.#grown && !this.#damaged) {
            this.#damaged = true;
            return true;
        }
        return false;
    }
}

module.exports = Attack;
