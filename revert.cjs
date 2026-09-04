const fs = require('fs');

let planner = fs.readFileSync('src/server/planner/planner.ts', 'utf8');
planner = planner.replace(/analyzeRasterWindow/g, 'analyzeRasterPixels');
planner = planner.replace(/analyze_raster/g, 'analyze_raster_pixels');
fs.writeFileSync('src/server/planner/planner.ts', planner);

let types = fs.readFileSync('src/types/index.ts', 'utf8');
types = types.replace(/analyzeRasterWindow/g, 'analyzeRasterPixels');
fs.writeFileSync('src/types/index.ts', types);

let registry = fs.readFileSync('src/server/tools/registry.ts', 'utf8');
registry = registry.replace(/analyzeRasterWindow/g, 'analyzeRasterPixels');
registry = registry.replace(/rasterAnalysisProvider/g, 'rasterPixelAnalysisProvider');
fs.writeFileSync('src/server/tools/registry.ts', registry);
