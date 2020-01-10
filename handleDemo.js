const demofile = require("demofile");
const fs = require("fs");

module.exports = demoFile => {
  return new Promise((resolve, reject) => {
    fs.readFile(demoFile, (err, buffer) => {
      const demoFile = new demofile.DemoFile();
      const data = {};

      // Gets rewritten for every round
      let roundData = generateNewRoundData();

      demoFile.on("start", () => {
        data.map = demoFile.header.mapName;
        data.totalTime = demoFile.header.playbackTime;
        data.players = {};
        data.rounds = [];
        console.log(demoFile.gameEvents.gameEventList);
      });

      demoFile.gameEvents.on("round_start", () => {
        for (const player of demoFile.players) {
          if (!data.players[player.steam64Id]) {
            data.players[player.steam64Id] = generateEmptyPlayerData(
              player.steam64Id
            );
          }
        }
      });

      demoFile.gameEvents.on("player_hurt", e => {
        const victim = demoFile.entities.getByUserId(e.userid);
        const attacker = demoFile.entities.getByUserId(e.attacker);

        let attackerData;

        // Sometimes there is no 'attacker'. Fall damage for example
        if (attacker) {
          attackerData = { steamId: attacker.steam64Id, name: attacker.name };
        } else {
          attackerData = null;
        }

        roundData.playerHurt.push({
          victim: {
            steamId: victim.steam64Id,
            name: victim.name
          },
          attacker: attackerData,
          tick: demoFile.currentTick,
          weapon: e.weapon,
          dmgHealth: e.dmg_health,
          dmgArmour: e.dmg_armor,
          hitgroup: e.hitgroup
        });
      });

      demoFile.gameEvents.on("player_death", e => {
        const victim = demoFile.entities.getByUserId(e.userid);
        const victimName = victim ? victim.name : "unnamed";

        // Attacker may have disconnected so be aware.
        // e.g. attacker could have thrown a grenade, disconnected, then that grenade killed another player.
        const attacker = demoFile.entities.getByUserId(e.attacker);
        const attackerName = attacker ? attacker.name : "unnamed";

        const headshotText = e.headshot ? " HS" : "";

        /*         console.log(
          `${attackerName} [${e.weapon}${headshotText}] ${victimName}`
        ); */
        roundData.kills.push({
          attacker: {
            steamId: attacker.steam64Id,
            equipmentValue: attacker.currentEquipmentValue,
            cashSpendThisRound: attacker.cashSpendThisRound,
            name: attacker.name,
            hasC4: attacker.hasC4,
            health: attacker.health,
            isScoped: attacker.isScoped,
            weapon: attacker.weapon.itemName,
            freezeTimeEndEquipmentValue: attacker.freezeTimeEndEquipmentValue,
            position: attacker.position
          },
          victim: {
            steamId: victim.steam64Id,
            equipmentValue: victim.currentEquipmentValue,
            cashSpendThisRound: victim.cashSpendThisRound,
            name: victim.name,
            hasC4: victim.hasC4,
            health: victim.health,
            isScoped: victim.isScoped,
            freezeTimeEndEquipmentValue: victim.freezeTimeEndEquipmentValue,
            position: victim.position
          },
          hs: e.headshot,
          tick: demoFile.currentTick
        });
      });

      // EXAMPLE: Round end info

      demoFile.gameEvents.on("round_officially_ended", e => {
        const teams = demoFile.teams;

        const terrorists = teams[2];
        const cts = teams[3];

        data.rounds.push(roundData);
        roundData = generateNewRoundData();
      });

      // When demo file is finished, resolve the function call
      demoFile.on("end", e => {
        resolve(data);
      });
      demoFile.parse(buffer);
    });
  });
};

function generateNewRoundData() {
  return {
    kills: [],
    playerHurt: []
  };
}

function generateEmptyPlayerData(steamId) {
  return {
    steamId: steamId,
    chatMessages: []
  };
}
