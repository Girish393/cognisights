const fs = require('fs');
const file = '/app/applet/src/components/map/utils.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /\} else if \(toolName === 'detectBuildings'\) \{\s*if \(data\.buildings && data\.buildings\.features && data\.buildings\.features\.length > 0\) \{/g,
  `} else if (toolName === 'detectBuildings' || toolName === 'detectObjects') {
      const featureSet = data.features || data.buildings;
      if (featureSet && featureSet.features && featureSet.features.length > 0) {`
);

code = code.replace(
  /geometry: data\.buildings,/g,
  `geometry: featureSet,`
);

code = code.replace(
  /featureCount: data\.count \|\| data\.buildings\.features\.length,/g,
  `featureCount: data.totalObjects || data.detectionCount || featureSet.features.length,`
);

fs.writeFileSync(file, code);
