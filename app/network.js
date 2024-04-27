const { createServer } = require("http");
const { networkInterfaces } = require("os");

const port = 19189;

/** @returns {Array<string>} */
const getIPs = () => {
	const networks = networkInterfaces();
	let ips = [];
	for (let i in networks) {
		for (const j in networks[i]) {
			if (networks[i][j].family !== "IPv4" || networks[i][j].internal) continue;
			ips.push(networks[i][j].address);
		}
	}
	return ips;
};

/** @param {number} port */
const isPortAvailable = async (port) => {
    const server = createServer(() => {});

    server.listen(port);
    return new Promise((resolve, reject) => {
        server.on("error", (err) => {
            server.close();
            reject(err.code);
        });
        server.on("listening", () => {
            server.close();
            resolve();
        });
    });
};

module.exports = {port, getIPs, isPortAvailable};
