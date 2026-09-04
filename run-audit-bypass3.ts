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
      
      // Inject missing target for semantic features (which relies on query.target in gemini prompt)
      inputData.featureType = q.structured.target;

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
    const result = await runPlan(q);
    console.log(`OVERALL_STATUS: ${result.overallStatus}`);
    
    console.log(`--- DAG & PROVIDER EXECUTION ---`);
    for (const step of result.execution) {
       console.log(`STEP: ${step.stepId} [STATE: ${step.executionState}] -> MSG: ${step.message || step.toolResult?.message || ""}`);
       if (step.toolResult?.data?.features) {
           const feats = step.toolResult.data.features?.features || (Array.isArray(step.toolResult.data.features) ? step.toolResult.data.features : []);
           console.log(`   -> Features count: ${feats.length}`);
       }
    }
  }
}
main();
