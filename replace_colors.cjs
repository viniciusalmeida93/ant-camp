const fs = require('fs');
const path = require('path');

function walk(dir, done) {
    let results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        let i = 0;
        (function next() {
            let file = list[i++];
            if (!file) return done(null, results);
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                        results.push(file);
                    }
                    next();
                }
            });
        })();
    });
}

walk(path.join(__dirname, 'src'), function (err, results) {
    if (err) throw err;
    let count = 0;

    const replacements = [
        { regex: /bg-\[#D71C1D\]/g, replacement: 'bg-primary' },
        { regex: /text-\[#D71C1D\]/g, replacement: 'text-primary' },
        { regex: /hover:text-\[#D71C1D\]/g, replacement: 'hover:text-primary' },
        { regex: /hover:bg-\[#D71C1D\]\/90/g, replacement: 'hover:bg-primary/90' },
        { regex: /hover:bg-\[#d11f2d\]/gi, replacement: 'hover:bg-primary/90' },
        { regex: /hover:bg-\[#b01617\]/gi, replacement: 'hover:bg-primary/90' },
        { regex: /hover:bg-\[#b51718\]/gi, replacement: 'hover:bg-primary/90' },
    ];

    results.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let original = content;

        replacements.forEach(({ regex, replacement }) => {
            content = content.replace(regex, replacement);
        });

        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            count++;
            console.log('Updated:', file);
        }
    });

    console.log(`Successfully updated ${count} files.`);
});
