function readFile(filename, url=undefined) {  
    const fs = require('node:fs');
    try {
        const output = fs.readFileSync(filename, 'utf8').split(/\r?\n\r?/);
        return output;
    } catch (err) {
        console.error(`Error reading "${filename}"!`);
        return err;
    }
}

module.exports = { readFile };