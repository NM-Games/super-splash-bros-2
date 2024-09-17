/**
 * @typedef {"daylight" | "sunset" | "night" | "synthwave" | "foggy" | "lava" | "slime"} Themes
 */

const colors = {
    theme: {
        daylight: "#23ffff",
        sunset: "#ffb914",
        night: "#000000",
        synthwave: "#1b023b",
        foggy: "#769aac",
        lava: "#410900",
        slime: "#004a0b"
    },
    players: [
        "#ffd900", // yellow
        "#47d727", // green
        "#ff1200", // red
        "#002eff", // blue
        "#ff7f00", // orange
        "#00e9ff", // cyan
        "#ee00ff", // purple
        "#7b7b7b"  // gray
    ],
    ui: {primary: "#42cbe0", secondary: "#32a4d9", indicator: "#800e00", highlight: "#df1"},
    bigNotification: {r: "red", o: "orange", y: "yellow", g: "green"},
    achievement: ["#b75c40", "#b3b3b3", "#dfcc25"],
    error: {background: "#700", foreground: "#e00"},
    text: {dark: "#505050", light: "#fff"},
    overlay: "rgba(0, 0, 0, 0.75)",
    squash: "rgba(200, 200, 200, 0.7)",
    shadow: "#000"
};

const filters = {
    lava: ["hue-rotate(190deg)", "brightness(0.6)", "saturate(2)"],
    slime: ["hue-rotate(270deg)", "brightness(1.3)"]
};

module.exports = {
    colors,
    filters,
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
        else if (from === "synthwave") return "foggy";
        else if (from === "foggy") return "lava";
        else if (from === "lava") return "slime";
        else if (from === "slime") return "daylight";
    },
    /**
     * Check whether the theme is a dark theme for optimal text colors.
     * @returns {boolean}
     */
    isDark: function() {
        return ["night", "synthwave", "foggy", "lava", "slime"].includes(this.current);
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
