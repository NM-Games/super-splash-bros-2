const { Client } = require("discord-rpc");

const { version } = require("../package.json");


let ready = false;

const client = new Client({transport: "ipc"});
client.login({
    clientId: "1245061758662479943",
    scopes: ["rpc.activities.write"],
    redirectUri: "https://github.com/NM-Games/super-splash-bros-2"
}).then(() => {}).catch((e) => {
    if (e.toString().includes("401")) ready = true;
});

/**
 * Set the Discord activity.
 * @param {{
 *  state: string | undefined,
 *  player: {index: number, name: string},
 *  party: {size: number | undefined, max: number | undefined},
 *  startTimestamp: number | undefined
 * }} activity
 */
module.exports = (activity) => {
    if (!ready) return;

    client.setActivity({
        state: activity.state,
        partySize: activity.party.size,
        partyMax: activity.party.max,
        startTimestamp: activity.startTimestamp,
        largeImageKey: "icon-activity",
        largeImageText: `Version ${version}`,
        smallImageKey: `icon-player-${activity.player.index}`,
        smallImageText: activity.player.name
    });
};
