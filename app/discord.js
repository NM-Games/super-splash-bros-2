const { Client } = require("discord-rpc");

const { version } = require("../package.json");


const client = new Client({transport: "ipc"});
client.login({clientId: "1245061758662479943", scopes: ["rpc.activities.write"]});

/**
 * Set the Discord activity.
 * @param {{
 *  state: string | undefined,
 *  player: {index: number, name: string},
 *  party: {size: number | undefined, max: number | undefined},
 *  startTimestamp: number | undefined
 * }} activity
 */
const setActivity = (activity) => {
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

module.exports = {setActivity};
