const fs = require('fs');
let code = fs.readFileSync('src/server/tools/changeDetectionProvider.test.ts', 'utf8');

code = code.replace(/buildings: \{ type: "FeatureCollection", features: featuresStart \}/g, 'features: { type: "FeatureCollection", features: featuresStart }');
code = code.replace(/buildings: \{ type: "FeatureCollection", features: featuresEnd \}/g, 'features: { type: "FeatureCollection", features: featuresEnd }');

fs.writeFileSync('src/server/tools/changeDetectionProvider.test.ts', code);
