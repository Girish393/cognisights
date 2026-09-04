const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');
if (code.includes('analyzeRasterPixels')) {
  console.log("Replacing in types...");
  code = code.replace(/analyzeRasterPixels/g, 'analyzeRasterWindow');
  fs.writeFileSync('src/types/index.ts', code);
  console.log("Done");
} else {
  console.log("Not found in types.");
}
