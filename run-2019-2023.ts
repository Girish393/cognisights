import fs from "fs";
import { handleQuery } from "./src/server/analysis/executor.js";

// Load from .env.example
const envFile = fs.readFileSync(".env.example", "utf8");
envFile.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length === 2 && !process.env[parts[0]]) {
    process.env[parts[0]] = parts[1].trim();
  }
});

async function main() {
  const userQuery = "Detect buildings added or removed between 2019 and 2023 in Seattle";
  console.log("Starting temporal query execution:", userQuery);

  const result = await handleQuery(userQuery);

  console.log("\n=== EXECUTION SUMMARY ===");
  console.log("Overall Status:", result.overallStatus);
  console.log("Final Answer:", result.finalAnswer);
  console.log("Parsed Query:", JSON.stringify(result.query, null, 2));

  for (const step of result.execution) {
    console.log(`\n--- Step: ${step.stepId} -> ${step.executionState} ---`);
    console.log("Message:", step.message || step.toolResult?.message);
    if (step.toolResult?.data) {
      const d = step.toolResult.data as any;
      if (d.aoi) console.log("  AOI:", JSON.stringify(d.aoi));
      if (d.imageryItems) console.log("  STAC Items Count:", d.imageryItems.length, "First ID:", d.imageryItems[0]?.id, "Date:", d.imageryItems[0]?.properties?.datetime || d.imageryItems[0]?.datetime);
      if (d.imageryAssets) console.log("  Assets Count:", d.imageryAssets.length, "First URL:", d.imageryAssets[0]?.href);
      if (d.window) console.log("  Geo Window:", JSON.stringify(d.window));
      if (d.pixelWindow) console.log("  Pixel Window:", JSON.stringify(d.pixelWindow));
      if (d.resolution) console.log("  Resolution:", JSON.stringify(d.resolution), "CRS:", d.crs);
      if (d.totalObjects !== undefined) {
        console.log("  Total Objects:", d.totalObjects);
        console.log("  Inference Status:", d.inferenceStatus);
        console.log("  Model:", d.model, "Version:", d.modelVersion);
        console.log("  Features Count:", d.features?.features ? d.features.features.length : (Array.isArray(d.features) ? d.features.length : 0));
        const feats = d.features?.features || (Array.isArray(d.features) ? d.features : []);
        if (feats.length) {
          console.log("  Sample Feature 0:", JSON.stringify(feats[0], null, 2));
        }
      }
      if (d.addedCount !== undefined || d.summary) {
        const sum = d.summary || d;
        console.log("  Added Count:", sum.addedCount ?? d.addedCount);
        console.log("  Removed Count:", sum.removedCount ?? d.removedCount);
        console.log("  Unchanged Count:", sum.unchangedCount ?? d.unchangedCount);
        console.log("  Baseline Date:", d.baselineDate, "Comparison Date:", d.comparisonDate);
        console.log("  Added Features Count:", d.added?.features?.length ?? d.addedFeatures?.features?.length);
        console.log("  Removed Features Count:", d.removed?.features?.length ?? d.removedFeatures?.features?.length);
        console.log("  Unchanged Features Count:", d.unchanged?.features?.length ?? d.unchangedFeatures?.features?.length);
        const addedFeats = d.added?.features || d.addedFeatures?.features || [];
        const removedFeats = d.removed?.features || d.removedFeatures?.features || [];
        const unchangedFeats = d.unchanged?.features || d.unchangedFeatures?.features || [];
        if (addedFeats.length) {
          console.log("  Sample Added Feature 0:", JSON.stringify(addedFeats[0], null, 2));
        }
        if (unchangedFeats.length) {
          console.log("  Sample Unchanged Feature 0:", JSON.stringify(unchangedFeats[0], null, 2));
        }
        if (removedFeats.length) {
          console.log("  Sample Removed Feature 0:", JSON.stringify(removedFeats[0], null, 2));
        }
      }
    }
  }

  console.log("\n=== EVIDENCE RECORDED ===");
  console.log("Total Evidence Count:", result.evidence?.length || 0);
  if (result.evidence?.length) {
    for (const ev of result.evidence) {
      console.log(`- [${ev.operation}] ${ev.dataset} (${ev.date}): ${ev.provenance || ev.source}`);
    }
  }
}

main().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
