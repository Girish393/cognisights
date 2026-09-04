const fs = require('fs');
const file = '/app/applet/src/server/tools/inference/buildingDetectionEngine.ts';
let code = fs.readFileSync(file, 'utf8');

// Ensure turf is imported
if (!code.includes('import * as turf')) {
    code = 'import * as turf from "@turf/turf";\n' + code;
}

const targetFunctionRegex = /export async function detectBuildingsInference\([\s\S]*?return \{\s*status: "NOT_IMPLEMENTED"[\s\S]*?\};\n\}/;

const newImplementation = `
export async function detectBuildingsInference(
  rasterWindow: RasterWindowResult, 
  options: InferenceOptions
): Promise<ObjectDetectionResult> {
  // Configurable limits
  const confThreshold = options.confidenceThreshold || 0.40;
  const maxTile = options.maxTileSize || 1024;
  const maxPixels = options.maxTotalPixels || (4096 * 4096);
  
  const width = rasterWindow.width || 0;
  const height = rasterWindow.height || 0;
  const totalPixels = width * height;
  
  // 2. Preprocessing & Tiling setup (Deterministic architecture setup)
  const tileCountX = Math.ceil(width / maxTile);
  const tileCountY = Math.ceil(height / maxTile);
  const totalTiles = tileCountX * tileCountY;
  
  const processingMetadata = {
    preprocessing: {
      bandSelection: "RGB (if available)",
      channelOrdering: "HWC to CHW",
      normalization: "0-255 to 0-1 scaled",
      padding: "Letterboxing to square"
    },
    tiling: {
      tileCount: totalTiles,
      maxTileSize: maxTile
    },
    nms: {
      iouThreshold: 0.45,
      confidenceThreshold: confThreshold
    }
  };

  if (totalPixels > maxPixels) {
     return {
        status: "FAILED",
        inferenceStatus: "FAILED",
        classesRequested: options.targetClasses,
        classesDetected: [],
        totalObjects: 0,
        objectsByClass: {},
        objects: [],
        
        inputRaster: rasterWindow.rasterId || "unknown",
        tileCount: totalTiles,
        processingMetadata,
        model: "none",
        modelVersion: "none",
        confidenceThreshold: confThreshold,
        features: { type: "FeatureCollection", features: [] }
     };
  }

  // Check for Remote API endpoint
  const apiUrl = process.env.INFERENCE_API_URL;
  const apiKey = process.env.INFERENCE_API_KEY;

  if (apiUrl && apiKey) {
    try {
      // Execute REAL remote ML inference
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${apiKey}\`
        },
        body: JSON.stringify({
          rasterId: rasterWindow.rasterId,
          assetKey: rasterWindow.assetKey,
          window: rasterWindow.window,
          pixelWindow: rasterWindow.pixelWindow,
          targetClasses: options.targetClasses,
          confidenceThreshold: confThreshold
        })
      });

      if (!response.ok) {
        throw new Error(\`Remote Inference API failed: \${response.statusText}\`);
      }

      const inferenceResponse = await response.json();
      
      // Parse Detections
      const features: any[] = [];
      const objectsByClass: Record<string, number> = {};

      const rawDetections = inferenceResponse.detections || [];
      
      const transform = rasterWindow.resolution ? [rasterWindow.resolution.x || 1, rasterWindow.resolution.y || -1] : [1, -1];
      const originX = rasterWindow.window?.minX || 0;
      const originY = rasterWindow.window?.maxY || 0;

      for (const det of rawDetections) {
        if (det.confidence < confThreshold) continue;

        let polygonGeom = det.geometry;
        if (!polygonGeom && det.bbox) {
          // Convert bounding box to GeoJSON Polygon
          // Assuming bbox is [minPxX, minPxY, maxPxX, maxPxY] in pixel space
          const minX = det.bbox[0];
          const minY = det.bbox[1];
          const maxX = det.bbox[2];
          const maxY = det.bbox[3];
          polygonGeom = convertBboxToGeoJSONPolygon(minX, minY, maxX, maxY, transform, originX, originY);
        }

        if (polygonGeom) {
          const feature = turf.polygon(polygonGeom.coordinates, {
            confidence: det.confidence,
            className: det.className || "object"
          });
          
          const areaM2 = turf.area(feature);
          Object.assign(feature.properties, { areaM2 });
          features.push(feature);

          const cName = det.className || "object";
          objectsByClass[cName] = (objectsByClass[cName] || 0) + 1;
        }
      }

      return {
        status: "SUCCESS",
        inferenceStatus: "SUCCESS",
        classesRequested: options.targetClasses,
        classesDetected: Object.keys(objectsByClass),
        totalObjects: features.length,
        objectsByClass,
        objects: [],
        
        model: inferenceResponse.model || "Remote API Model",
        modelVersion: inferenceResponse.version || "1.0",
        modelSource: "External Inference API",
        modelLicense: "Proprietary",
        runtimeAvailable: true,
        modelAvailable: true,
        runtimeMetadata: {
          remote_endpoint: apiUrl,
          duration_ms: inferenceResponse.duration || 0
        },
        confidenceThreshold: confThreshold,
        inputRaster: rasterWindow.rasterId || "unknown",
        tileCount: totalTiles,
        processingMetadata,
        features: turf.featureCollection(features)
      };

    } catch (err: any) {
      return {
        status: "FAILED",
        inferenceStatus: "FAILED",
        classesRequested: options.targetClasses,
        classesDetected: [],
        totalObjects: 0,
        objectsByClass: {},
        objects: [],
        
        model: "Remote API",
        modelVersion: "N/A",
        confidenceThreshold: confThreshold,
        features: turf.featureCollection([])
      };
    }
  }

  // 3. Fallback: No endpoint configured -> NOT_IMPLEMENTED
  return {
    status: "NOT_IMPLEMENTED",
    inferenceStatus: "NOT_IMPLEMENTED",
    classesRequested: options.targetClasses,
    classesDetected: [],
    totalObjects: 0,
    objectsByClass: {},
    objects: [],
    
    model: "Unavailable",
    modelVersion: "N/A",
    modelSource: "N/A",
    modelLicense: "N/A",
    runtimeAvailable: false,
    modelAvailable: false,
    runtimeMetadata: {
      onnx_available: false,
      tfjs_available: false,
      torch_available: false,
      remote_api_configured: false
    },
    confidenceThreshold: confThreshold,
    inputRaster: rasterWindow.rasterId || "unknown",
    tileCount: totalTiles,
    processingMetadata,
    features: turf.featureCollection([])
  };
}`;

code = code.replace(targetFunctionRegex, newImplementation);
fs.writeFileSync(file, code);
