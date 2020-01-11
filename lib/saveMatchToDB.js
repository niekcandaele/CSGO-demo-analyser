const prisma = require("../prisma-client").prisma;

module.exports = async function saveMatchToDb(data, hash) {
  const timeStarted = Date.now();
  const players = [];
  const rounds = [];
  const playerHurt = [];
  const grenades = [];
  const blinded = [];

  /**
   * Player records
   */

  for (const i in data.players) {
    if (data.players.hasOwnProperty(i)) {
      const player = data.players[i];
      const playerRecord = await prisma.upsertPlayer({
        create: { name: player.name, steamId: player.steamId },
        update: { name: player.name },
        where: { steamId: player.steamId }
      });
      players.push(playerRecord);
    }
  }

  const match = await prisma.createMatch({
    fileHash: hash,
    players: {
      connect: players.map(p => {
        return { id: p.id };
      })
    }
  });

  /**
   * Round records
   */

  for (const i in data.rounds) {
    if (data.rounds.hasOwnProperty(i)) {
      const kills = [];
      const round = data.rounds[i];
      const roundRecord = await prisma.createRound({
        match: { connect: { id: match.id } }
      });
      rounds.push(roundRecord);

      for (const kill of round.kills) {
        const attacker = await createPlayerInfo(kill.attacker);
        const victim = await createPlayerInfo(kill.victim);

        const createKillData = {
          round: { connect: { id: roundRecord.id } },
          headshot: kill.hs,
          tick: kill.tick,
          attacker: { connect: { id: attacker.id } },
          victim: { connect: { id: victim.id } }
        };

        if (kill.assister) {
          const assister = await createPlayerInfo(kill.assister);
          createKillData.assister = { connect: { id: assister.id } };
        }

        const killRecord = await prisma.createKill(createKillData);
        kills.push(killRecord);
      }

      await prisma.updateRound({
        data: {
          kills: {
            connect: kills.map(k => {
              return { id: k.id };
            })
          }
        },
        where: { id: roundRecord.id }
      });
      kills.length = 0;
    }
  }

  await prisma.updateMatch({
    data: {
      rounds: {
        connect: rounds.map(r => {
          return { id: r.id };
        })
      }
    },
    where: { id: match.id }
  });

  async function createPlayerInfo(data) {
    return await prisma.createPlayerInfo({
      player: {
        connect: { id: players.find(p => p.steamId === data.steamId).id }
      },
      position: { create: data.position },
      cashSpendThisRound: data.cashSpendThisRound,
      freezeTimeEndEquipmentValue: data.freezeTimeEndEquipmentValue,
      equipmentValue: data.equipmentValue,
      health: data.health,
      hasC4: data.hasC4,
      isScoped: data.isScoped,
      weapon: data.weapon
    });
  }

  const timeEnded = Date.now();

  console.log(
    `Saved match ${hash} to database - took ${timeEnded - timeStarted} ms`
  );
};
