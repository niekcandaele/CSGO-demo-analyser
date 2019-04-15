const fs = require("fs");
const path = require('path');
const handleDemo = require('./handleDemo');

const demoDir = './demos'

fs.readdir(demoDir, async (err, files) => {
    files = files.map(join(demoDir));

    for (const file of files) {
        if (file.endsWith('.dem')) {
            console.log('------------------------------------\n')
            console.log(`Handling demo file ${file}`)
            console.log('------------------------------------\n')
            let demoData = await handleDemo(file);
            console.log('------------------------------------\n')
            console.log(`Finished reading data from demo`)
            console.log(demoData);
            console.log('------------------------------------\n')
        }
    }

});

function join(dir) {
    return function (file) {
        return path.join(dir, file);
    };
}