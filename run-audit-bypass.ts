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
    nlQuery: "Detect buildings in Seattle",
    structured: {
      intent: "find_objects",
      target: "buildings",
      operation: "object_detection",
      spatialConstraint: {
        location: "Seattle"
      }
    }
  },
  {
    nlQuery: "Detect buildings added or removed between 2019 and 2023 in Seattle",
    structured: {
      intent: "find_changes",
      target: "buildings",
      operation: "change_detection",
      timeRange: { start: "2019", end: "2023" },
      spatialConstraint: { location: "Seattle" }
    }
  },
  {
    nlQuery: "Analyze vegetation in Pune",
    structured: {
      intent: "analyze_vegetation",
      target: "vegetation",
      operation: "raster_pixel_analysis",
      spatialConstraint: { location: "Pune" }
    }
  },
  {
    nlQuery: "Find hospitals near Pune",
    structured: {
      intent: "find_features",
      target: "hospitals",
      operation: "searchGeospatialFeatures",
      spatialConstraint: { location: "Pune" }
    }
  },
  {
    nlQuery: "Find roads within 500 meters of Pune",
    structured: {
      intent: "find_features_buffer",
      target: "roads",
      operation: "searchGeospatialFeatures",
      spatialConstraint: {
        location: "Pune",
        buffer: { distance: 500, units: "meters" }
      }
    }
  }
];

async function runPlan(q: any) {
    const plan = createQueryPlan(q.structured);
    const executionSteps: StepExecution[] = [];
    const evidence: Evidence[] = [];
    const stepResults = new Map<string, any>();
    const stepStates = new Map<string, ExecutionState>();
    
    for (const step of plan) {
      let canExecute = true;
      const failedDeps: string[] = [];
      
      for (const dep of step.dependsOn) {
        const depState = stepStates.get(dep);
        if (depState !== "SUCCESS") {
          canExecute = false;
          failedDeps.push(dep);
        }
      }

      if (!canExecute) {
        stepStates.set(step.stepId, "SKIPPED");
        executionSteps.push({ ...step, executionState: "SKIPPED", message: `Skipped due to failed dependencies: ${failedDeps.join(", ")}` });
        continue;
      }

      stepStates.set(step.stepId, "IN_PROGRESS");
      
      const inputData = { ...(step.parameters || {}) };
      inputData.dependencyOutputs = {};
      for (const dep of step.dependsOn) {
        inputData.dependencyOutputs[dep] = stepResults.get(dep);
      }

      try {
        const result = await executeTool(step.toolName, inputData);
        if (result.status === "SUCCESS") {
          stepStates.set(step.stepId, "SUCCESS");
          stepResults.set(step.stepId, result.data);
        } else if (result.status === "NOT_IMPLEMENTED") {
          stepStates.set(step.stepId, "NOT_IMPLEMENTED");
        } else {
          stepStates.set(step.stepId, "FAILED");
        }
        
        if (result.evidence) {
          evidence.push(...result.evidence);
        }
        
        executionSteps.push({
          ...step,
          executionState: stepStates.get(step.stepId)!,
          message: result.message,
          toolResult: result
        });
      } catch (err: any) {
        stepStates.set(step.stepId, "FAILED");
        executionSteps.push({ ...step, executionState: "FAILED", message: err.message });
      }
    }
    
    let overallStatus = "SUCCESS";
    if (executionSteps.some(s => s.executionState === "FAILED")) overallStatus = "PARTIAL";
    if (executionSteps.some(s => s.executionState === "NOT_IMPLEMENTED")) overallStatus = "PARTIAL";
    if (executionSteps.every(s => s.executionState === "FAILED" || s.executionState === "SKIPPED")) overallStatus = "FAILED";
    if (executionSteps.every(s => s.executionState === "NOT_IMPLEMENTED")) overallStatus = "NOT_IMPLEMENTED";
    
    return { overallStatus, execution: executionSteps, evidence, query: q.structured };
}

async function main() {
  for (const q of queries) {
    console.log(`\n==================================================`);
    console.log(`QUERY: "${q.nlQuery}"`);
    console.log(`==================================================`);
    try {
      const result = await runPlan(q);
      console.log(`OVERALL_STATUS: ${result.overallStatus}`);
      console.log(`PARSED_QUERY:`, JSON.stringify(result.query, null, 2));
      
      console.log(`--- DAG & PROVIDER EXECUTION ---`);
      for (const step of result.execution) {
         console.log(`STEP: ${step.stepId} [STATE: ${step.executionState}] -> MSG: ${step.message || step.toolResult?.message || ""}`);
         if (step.toolResult?.data?.features) {
             const feats = step.toolResult.data.features?.features || (Array.isArray(step.toolResult.data.features) ? step.toolResult.data.features : []);
             console.log(`   -> Features count: ${feats.length}`);
         }
         if (step.toolResult?.data?.addedCount !== undefined) {
             console.log(`   -> Added: ${step.toolResult.data.addedCount}, Removed: ${step.toolResult.data.removedCount}, Unchanged: ${step.toolResult.data.unchangedCount}`);
         }
      }
      console.log(`--- EVIDENCE ---`);
      (result.evidence || []).forEach(e => {
         console.log(`- ${e.operation} | ${e.dataset} | ${e.source}`);
      });
    } catch (err) {
      console.log(`ERROR executing query:`, err.message || err);
    }
  }
}
main();
