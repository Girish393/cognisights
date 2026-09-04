const fs = require('fs');
let planner = fs.readFileSync('src/server/planner/planner.ts', 'utf8');
planner = planner.replace(/analyzeRasterPixels/g, 'analyzeRasterWindow');
fs.writeFileSync('src/server/planner/planner.ts', planner);

let types = fs.readFileSync('src/types/index.ts', 'utf8');
types = types.replace(/analyzeRasterPixels/g, 'analyzeRasterWindow');
fs.writeFileSync('src/types/index.ts', types);

let registry = fs.readFileSync('src/server/tools/registry.ts', 'utf8');
registry = registry.replace(/analyzeRasterPixels/g, 'analyzeRasterWindow');
registry = registry.replace(/rasterPixelAnalysisProvider/g, 'rasterAnalysisProvider');
fs.writeFileSync('src/server/tools/registry.ts', registry);
