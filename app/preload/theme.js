/**
 * @typedef {"daylight" | "sunset" | "night" | "synthwave"} Themes
 */

const colors = {
    theme: {
        daylight: "#23ffff",
        sunset: "#ffb914",
        night: "#000000",
        synthwave: "#1b023b",
    },
    players: {
        p1: "#ffd900",
        p2: "#47d727",
        p3: "#ff1200",
        p4: "#002eff",
        p5: "#ff7f00",
        p6: "#00e9ff",
        p7: "#ee00ff",
        p8: "#7b7b7b"
    },
    ui: {primary: "#42cbe0", secondary: "#32a4d9"},
    error: {background: "#700", foreground: "#e00"},
    text: {dark: "#505050", light: "#ffffff"},
    overlay: "rgba(0, 0, 0, 0.75)"
};

module.exports = {
    colors,
    /** @type {Themes} */
    current: "daylight",

    /** 
     * Get the next theme in the cycle. This does NOT actually change it!
     * @param {Themes} from
     * @returns {Themes}
     */
    cycle: function(from = this.current) {
        if (from === "daylight") return "sunset";
        else if (from === "sunset") return "night";
        else if (from === "night") return "synthwave";
        else if (from === "synthwave") return "daylight";
    },
    /**
     * Check whether the theme is a dark theme for optimal text colors.
     * @returns {boolean}
     */
    isDark: function() {
        return ["night", "synthwave"].includes(this.current);
    },
    /**
     * Get the background color/gradient.
     * @returns {string}
     */
    getBackgroundColor: function() {
        return colors.theme[this.current];
    },
    /**
     * Get the text color for the selected theme
     * @returns {string}
     */
    getTextColor: function() {
        return (this.isDark() ? colors.text.light : colors.text.dark);
    }
};
