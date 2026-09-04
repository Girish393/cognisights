import { createQueryPlan } from "./src/server/planner/planner.js";
import { executeTool } from "./src/server/tools/registry.js";

async function runE2E() {
  const structuredQuery = { target: "hospitals", operation: "search", location: { name: "Pune" }, spatialConstraints: [] };
  const plan = createQueryPlan(structuredQuery as any);
  
  const stepResults = new Map();
  const stepStates = new Map();
  
  for (const step of plan) {
    let canExecute = true;
    for (const dep of step.dependsOn) {
      if (stepStates.get(dep) !== "SUCCESS") {
        canExecute = false;
      }
    }
    
    if (!canExecute) {
      stepStates.set(step.id, "SKIPPED");
      continue;
    }
    
    const toolInput = { ...step.input, dependencyOutputs: {} };
    for (const dep of step.dependsOn) {
      toolInput.dependencyOutputs[dep] = stepResults.get(dep);
    }
    
    const result = await executeTool(step.toolName, toolInput);
    stepStates.set(step.id, result.status);
    stepResults.set(step.id, result.data);
    
    console.log(`Step ${step.id} - State: ${result.status} | Tool: ${result.toolName}`);
    if (result.status === "FAILED") {
       console.log("Error Message:", result.message);
    }
  }
}
runE2E();
