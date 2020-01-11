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
        roundData = generateNewRoundData();
        for (const player of demoFile.players) {
          if (!data.players[player.steam64Id]) {
            data.players[player.steam64Id] = generateEmptyPlayerData(
              player.steam64Id
            );
          }
        }
      });

      /**
       * Bomb methods
       */

      demoFile.gameEvents.on("bomb_planted", e => {
        const player = demoFile.entities.getByUserId(e.userid);
        //console.log(`Bomb planted on site ${e.site} by ${player.name}`);
        roundData.bombPlanted = {
          by: player.steam64Id,
          location: player.position,
          site: e.site,
          tick: demoFile.currentTick
        };
      });

      demoFile.gameEvents.on("bomb_defused", e => {
        const player = demoFile.entities.getByUserId(e.userid);
        //console.log(`Bomb defused on site ${e.site} by ${player.name}`);
        roundData.bombDefused = {
          by: player.steam64Id,
          location: player.position,
          site: e.site,
          tick: demoFile.currentTick
        };
      });

      demoFile.gameEvents.on("bomb_exploded", e => {
        //console.log(`Bomb exploded on site ${e.site}`);
        roundData.bombDefused = {
          site: e.site,
          tick: demoFile.currentTick
        };
      });

      /**
       * Nade methods
       */

      demoFile.gameEvents.on("hegrenade_detonate", e => {
        const player = demoFile.entities.getByUserId(e.userid);
        //console.log(`${player.name} detonated a HE ${e.x} ${e.y} ${e.z}`);
        roundData.grenades.push({
          type: "HE",
          position: { x: e.x, y: e.y, z: e.z },
          player: { steamId: player.steam64Id, name: player.name }
        });
      });

      demoFile.gameEvents.on("flashbang_detonate", e => {
        const player = demoFile.entities.getByUserId(e.userid);
        //console.log(`${player.name} detonated a flash ${e.x} ${e.y} ${e.z}`);
        roundData.grenades.push({
          type: "flash",
          position: { x: e.x, y: e.y, z: e.z },
          player: { steamId: player.steam64Id, name: player.name }
        });
      });

      demoFile.gameEvents.on("smokegrenade_detonate", e => {
        const player = demoFile.entities.getByUserId(e.userid);
        //console.log(`${player.name} detonated a smoke ${e.x} ${e.y} ${e.z}`);
        roundData.grenades.push({
          type: "smoke",
          position: { x: e.x, y: e.y, z: e.z },
          player: { steamId: player.steam64Id, name: player.name }
        });
      });

      // TODO: molotovs
      /*
      These are a bit tricky
      https://saul.github.io/demofile/interfaces/_eventtypes_.inonspecificgameeventinfernostartburn.html -> Does not include the player that threw the molotov
      https://saul.github.io/demofile/interfaces/_eventtypes_.ieventmolotovdetonate.html -> Unexpected data, I think this only happens if a molly explodes mid air
      */

      /**
       * Player methods
       */

      demoFile.gameEvents.on("player_blind", e => {
        const victim = demoFile.entities.getByUserId(e.userid);
        const attacker = demoFile.entities.getByUserId(e.attacker);
        //console.log(`${victim.name} was blinded for ${e.blind_duration} by ${attacker.name}`);
        roundData.blinded.push({
          victim: {
            steamId: victim.steam64Id,
            name: victim.name,
            position: victim.position
          },
          attacker: {
            steamId: attacker.steam64Id,
            name: attacker.name
          },
          duration: e.blind_duration
        });
      });

      demoFile.gameEvents.on("player_hurt", e => {
        const victim = demoFile.entities.getByUserId(e.userid);
        const attacker = demoFile.entities.getByUserId(e.attacker);

        //console.log(`${victim.name} took ${e.dmg_health} damage from ${attacker.name}`);
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
        const attacker = demoFile.entities.getByUserId(e.attacker);
        const assister = demoFile.entities.getByUserId(e.assister);

        // Attacker may have disconnected so be aware.
        // e.g. attacker could have thrown a grenade, disconnected, then that grenade killed another player.

        /*         console.log(
          `${attackerName} [${e.weapon}${headshotText}] ${victimName}`
        ); */

        let assisterData;

        if (assister) {
          assisterData = {
            steamId: assister.steam64Id,
            cashSpendThisRound: assister.cashSpendThisRound,
            name: assister.name,
            health: assister.health,
            freezeTimeEndEquipmentValue: assister.freezeTimeEndEquipmentValue
          };
        } else {
          assisterData = false;
        }

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
          assister: assisterData,
          hs: e.headshot,
          tick: demoFile.currentTick
        });
      });

      demoFile.gameEvents.on("round_officially_ended", e => {
        const teams = demoFile.teams;

        const terrorists = teams[2];
        const cts = teams[3];

        data.rounds.push(roundData);
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
    playerHurt: [],
    grenades: [],
    blinded: [],
    bombPlanted: false,
    bombDefused: false,
    bombExploded: false
  };
}

function generateEmptyPlayerData(steamId) {
  return {
    steamId: steamId,
    chatMessages: []
  };
}
