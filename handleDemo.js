const demofile = require("demofile");
const fs = require("fs");

module.exports = (demoFile) => {
    return new Promise((resolve, reject) => {

        fs.readFile(demoFile, (err, buffer) => {
            const demoFile = new demofile.DemoFile();
            const data = {};

            demoFile.on("start", () => {
                data.map = demoFile.header.mapName;
                data.totalTime = demoFile.header.playbackTime;
                data.players = {};
            });

            demoFile.gameEvents.on('round_start', () => {
                for (const player of demoFile.players) {
                    data.players[player.steam64Id] = {}
                }
            });

            /**
             * v ALU CODE GOES HERE v
             */


            // EXAMPLE: Kills
            demoFile.gameEvents.on("player_death", e => {
                const victim = demoFile.entities.getByUserId(e.userid);
                const victimName = victim ? victim.name : "unnamed";

                // Attacker may have disconnected so be aware.
                // e.g. attacker could have thrown a grenade, disconnected, then that grenade killed another player.
                const attacker = demoFile.entities.getByUserId(e.attacker);
                const attackerName = attacker ? attacker.name : "unnamed";

                const headshotText = e.headshot ? " HS" : "";

                console.log(`${attackerName} [${e.weapon}${headshotText}] ${victimName}`);
            });

            // EXAMPLE: Round end info

            demoFile.gameEvents.on("round_officially_ended", e => {
                const teams = demoFile.teams;

                const terrorists = teams[2];
                const cts = teams[3];

                console.log(`\tTerrorists score ${terrorists.score}\n\tCTs: score ${cts.score}`)
            });

            /**
             * ^ ALU CODE GOES HERE ^
             */

            // When demo file is finished, resolve the function call
            demoFile.on("end", e => {
                resolve(data)
            });
            demoFile.parse(buffer);
        });
    })
}