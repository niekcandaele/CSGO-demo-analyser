const crypto = require("crypto");
const fs = require("fs");

const algorithm = "sha1";

module.exports = function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const shasum = crypto.createHash(algorithm);

    const filename = __dirname + "/../" + filePath,
      s = fs.ReadStream(filename);
    s.on("data", function(data) {
      shasum.update(data);
    });

    // making digest
    s.on("end", function() {
      const hash = shasum.digest("hex");
      resolve(hash);
    });
  });
};
