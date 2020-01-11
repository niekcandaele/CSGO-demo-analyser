const fs = require("fs");
const path = require("path");
const handleDemo = require("./lib/handleDemo");
const util = require("util");

const saveMatchToDb = require("./lib/saveMatchToDB");
const calcFileHash = require("./lib/calcFileHash");
const prisma = require("./prisma-client").prisma;

const demoDir = "./demos";

fs.readdir(demoDir, async (err, files) => {
  files = files.map(join(demoDir));

  for (const file of files) {
    if (file.endsWith(".dem")) {
      const hash = await calcFileHash(file);
      const exists = await matchExists(hash);
      if (!exists) {
        console.log("------------------------------------\n");
        console.log(`Handling demo file ${file}`);
        console.log("------------------------------------\n");
        const demoData = await handleDemo(file);
        console.log("------------------------------------\n");
        console.log(`Finished reading data from demo`);
        console.log(util.inspect(demoData, { depth: null, colors: true }));
        console.log("------------------------------------\n");

        await saveMatchToDb(demoData, hash);
      }
    }
  }
});

function join(dir) {
  return function(file) {
    return path.join(dir, file);
  };
}

async function matchExists(hash) {
  const found = await prisma.match({ fileHash: hash });
  return Boolean(found);
}
