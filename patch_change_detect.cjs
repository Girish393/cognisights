const fs = require('fs');
let code = fs.readFileSync('src/server/tools/changeDetectionProvider.ts', 'utf8');

const regex1 = /const t1Result = deps\[t1Key\] as BuildingDetectionResult;\n    const t2Result = deps\[t2Key\] as BuildingDetectionResult;/;
const replace1 = `const t1Result = deps[t1Key] as any;
    const t2Result = deps[t2Key] as any;
    
    if (t1Result?.status === "NOT_IMPLEMENTED" || t2Result?.status === "NOT_IMPLEMENTED") {
       return {
         toolName: "detectChange",
         status: "NOT_IMPLEMENTED",
         message: "Change detection is unavailable because upstream building detection is not implemented.",
         evidence: []
       };
    }
    if (t1Result?.inferenceStatus === "NOT_IMPLEMENTED" || t2Result?.inferenceStatus === "NOT_IMPLEMENTED") {
       return {
         toolName: "detectChange",
         status: "NOT_IMPLEMENTED",
         message: "Change detection is unavailable because upstream building inference is not implemented.",
         evidence: []
       };
    }
    `;

code = code.replace(regex1, replace1);

const regex2 = /import \{ ToolResult, ChangeDetectionResult, BuildingDetectionResult, GeoJSONFeatureCollection \} from "\.\.\/\.\.\/types\/index\.js";/;
const replace2 = `import { ToolResult, ChangeDetectionResult, GeoJSONFeatureCollection } from "../../types/index.js";`;

code = code.replace(regex2, replace2);

fs.writeFileSync('src/server/tools/changeDetectionProvider.ts', code);
