import fs from "fs";
const envFile = fs.readFileSync(".env", "utf8");
envFile.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length === 2 && !process.env[parts[0]]) {
    process.env[parts[0]] = parts[1].trim();
  }
});

import { handleQuery } from "./src/server/analysis/executor.js";

const queries = [
  // "Detect buildings in Seattle",
  "Detect buildings added or removed between 2019 and 2023 in Seattle",
  "Analyze vegetation in Pune",
  "Find hospitals near Pune",
  "Find roads within 500 meters of Pune"
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  for (const q of queries) {
    console.log(`\n==================================================`);
    console.log(`QUERY: "${q}"`);
    console.log(`==================================================`);
    let success = false;
    let attempts = 0;
    while (!success && attempts < 5) {
        attempts++;
        try {
          const result = await handleQuery(q);
          console.log(`OVERALL_STATUS: ${result.overallStatus}`);
          console.log(`FINAL_ANSWER: ${result.finalAnswer}`);
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
          success = true;
        } catch (err) {
          console.log(`ERROR executing query (Attempt ${attempts}):`, err.message || err);
          if (err.message && (err.message.includes("429") || err.message.includes("fetch failed") || err.message.includes("503"))) {
              console.log("Transient error. Waiting 35 seconds before retry...");
              await sleep(35000);
          } else {
              break;
          }
        }
    }
    
    // Wait for 15 seconds to avoid Gemini rate limits
    if (success) {
      console.log("Waiting 20 seconds before next query...");
      await sleep(20000);
    }
  }
}
main();
