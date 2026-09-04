import fs from "fs";
const envFile = fs.readFileSync(".env.example", "utf8");
envFile.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length === 2 && !process.env[parts[0]]) {
    process.env[parts[0]] = parts[1].trim();
  }
});

import { createQueryPlan } from "./src/server/planner/planner.js";
import { executeTool } from "./src/server/tools/registry.js";
import { StepExecution, Evidence, ExecutionState } from "./src/types/index.js";

const queries = [
  {
    nlQuery: "Analyze vegetation in Pune",
    structured: {
      intent: "analyze_vegetation",
      target: "vegetation",
      operation: "raster_pixel_analysis",
      location: { name: "Pune" }
    }
  },
  {
    nlQuery: "Find hospitals near Pune",
    structured: {
      intent: "find_features",
      target: "hospitals",
      operation: "searchGeospatialFeatures",
      location: { name: "Pune" }
    }
  },
  {
    nlQuery: "Find roads within 500 meters of Pune",
    structured: {
      intent: "find_features_buffer",
      target: "roads",
      operation: "searchGeospatialFeatures",
      location: { name: "Pune" } // Note: we'll simulate buffer via intent/operation just to see DAG
    }
  }
];

async function runPlan(q: any) {
    const plan = createQueryPlan(q.structured);
    return plan.map(s => s.toolName);
}

async function main() {
  for (const q of queries) {
    console.log(`QUERY: "${q.nlQuery}"`);
    const plan = await runPlan(q);
    console.log(`PLAN: ${JSON.stringify(plan)}`);
  }
}
main();
