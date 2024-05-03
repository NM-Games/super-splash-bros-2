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
    ui: {primary: "#42cbe0", secondary: "#32a4d9", error: "#e00"},
    text: {dark: "#505050", light: "#ffffff"}
};

module.exports = {
    colors,
    /** @type {Themes} */
    current: "daylight",

    /** 
     * Cycle themes
     * @returns {Themes}
     */
    cycle: function() {
        if (this.current === "daylight") this.current = "sunset";
        else if (this.current === "sunset") this.current = "night";
        else if (this.current === "night") this.current = "synthwave";
        else if (this.current === "synthwave") this.current = "daylight";

        return this.current;
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
