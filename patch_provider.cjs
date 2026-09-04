const fs = require('fs');
const file = '/app/applet/src/server/tools/objectDetectionProvider.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /source: "Local Environment",\s*dataset: "Model Registry",/,
  'source: inferenceResult.modelSource || "Local Environment",\n         dataset: "Model Registry",'
);

fs.writeFileSync(file, code);
