const fs = require('fs');
let code = fs.readFileSync('src/server/tools/changeDetectionProvider.ts', 'utf8');

code = code.replace(/k\.includes\("detect_buildings"\)/g, 'k.includes("detect_objects") || k.includes("detect_buildings")');
fs.writeFileSync('src/server/tools/changeDetectionProvider.ts', code);
