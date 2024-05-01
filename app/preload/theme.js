const colors = {
    theme: {
        daylight: {primary: "#23ffff", secondary: "#23ffff"},
        sunset: {primary: "#ffb914", secondary: "#ffff00"},
        night: {primary: "#000000", secondary: "#ffffff"}
    },
    players: {
        p1: "#ffd900",
        p2: "#47d727",
        p3: "#ff1200",
        p4: "#002eff"
    },
    ui: {primary: "#42cbe0", secondary: "#32a4d9", error: "#e00"},
    text: {dark: "#505050", light: "#ffffff"}
};

module.exports = {
    colors,
    /** @type {"daylight" | "sunset" | "night"} */
    current: "daylight",

    /** Cycle themes */
    cycle: function() {
        if (this.current === "daylight") this.current = "sunset";
        if (this.current === "sunset") this.current = "night";
        if (this.current === "night") this.current = "daylight";
    },
    /**
     * Check whether the theme is a dark theme for optimal text colors.
     * @returns {boolean}
     */
    isDark: function() {
        return (this.current === "night");
    },
    /**
     * Get the primary and secondary background colors
     * @returns {{primary: string, secondary: string}}
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
