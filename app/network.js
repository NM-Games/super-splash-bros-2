const { createServer } = require("http");
const { networkInterfaces } = require("os");

const port = 19189;

/** @returns {string[]} */
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

/**
 * Check whether a port is available.
 * @async
 * @param {number} port
 * @returns {Promise.<undefined>}
 * @throws {Error}
 */
const isPortAvailable = (port) => {
    const server = createServer(() => {});

    server.listen(port);
    return new Promise((resolve, reject) => {
        server.on("error", (err) => {
            server.close();
            reject(err);
        });
        server.on("listening", () => {
            server.close();
            resolve();
        });
    });
};

/**
 * Check whether a string with IP address fragments is valid.
 * @param {string[]} ip
 * @returns {boolean}
 */
const isValidIP = (ip) => {
    let error = 0;
    for (let i=0; i<ip.length; i++) {
        ip[i] = parseInt(ip[i]);
        if (isNaN(ip[i]) || ip[i] < 0 || ip[i] >= 255) error++;
    }
    return (error === 0);
};

module.exports = {port, getIPs, isPortAvailable, isValidIP};
