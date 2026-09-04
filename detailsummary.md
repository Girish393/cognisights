# CogniSights / SATQuery AI - Detailed Project Summary

## 1. Project Overview
**Problem Statement:** ISRO SIH 26167 - "SatQuery AI - An Interactive Vision-Language Assistant for Multimodal Remote Sensing Image Analysis through Text Queries."
**Goal:** To build a production-grade, highly resilient system that allows users to perform complex geospatial and temporal analysis on satellite imagery (Optical & SAR) using natural language queries, without leaking data to external public ML web services.

## 2. Core Architecture: The "LLM-Deterministic Sandwich" Pattern
The system is built on a highly decoupled architecture that isolates unpredictable LLM text generation from deterministic geospatial processing. 

### Step-by-Step Pipeline Workflow:
1. **Multimodal Ingestion (Frontend):** 
   - Users drag and drop heavy-duty multi-band `.tif` / `.tiff` (GeoTIFF) files into the React UI (`QueryInput.tsx`).
   - The files and the Natural Language Query (nlQuery) are bundled into a binary `FormData` multi-part stream.
2. **Local Caching (Node.js Backend):** 
   - The Express server (`api.ts`) intercepts the request using `multer`. 
   - GeoTIFF files are securely cached in a local `data/uploads/` directory to prevent memory overflow and satisfy "Bring Your Own Data" air-gapped requirements.
3. **Intent Parsing (Top Bun):** 
   - The user's text query is sent to Gemini (via `@google/genai`) strictly to parse the English intent into a rigidly validated JSON `StructuredQuery` (extracting targets, dates, operations, and spatial constraints). No images are sent to Gemini.
4. **Deterministic DAG Planning (The Meat):** 
   - `planner.ts` dynamically generates a Directed Acyclic Graph (DAG) of geospatial tasks based on the `StructuredQuery`. 
   - Tasks include `resolveAreaOfInterest`, `processRasterWindow`, `detectChange`, `vqa`, etc.
5. **Execution & Routing (`executor.ts`):** 
   - The orchestrator executes the DAG step-by-step, passing outputs of parent nodes to child nodes.
6. **Local ML Microservice Execution:** 
   - When a step requires Vision-Language processing (like Scene Captioning or VQA) or deep matrix math (Bi-Temporal Change Detection), `remoteInferenceAdapter.ts` tunnels the local file paths directly to an internal Python FastAPI microservice.
   - **PaliGemma** (a lightweight open-source foundation model) natively processes the raw spatial tensors, keeping operations secure and ISRO-compliant.
7. **Synthesis & Visualization (Bottom Bun):** 
   - The extracted GeoJSON features, metrics, and ML outputs are passed back up the chain. Gemini synthesizes a final readable English summary, and the React frontend renders the vectors natively on a Leaflet Map interface.

## 3. Technology Stack

### Frontend (Client-Side)
*   **Framework:** React 19, TypeScript, Vite
*   **Styling:** TailwindCSS
*   **Geospatial Visualization:** `react-leaflet`, `leaflet`
*   **State Management:** React Hooks, FormData binary tunneling

### Orchestration Backend (Server-Side)
*   **Runtime:** Node.js, Express
*   **File Handling:** `multer` (DiskStorage)
*   **AI Orchestration:** `@google/genai` (Gemini 3.6 Flash for structural planning)
*   **Validation:** `zod`
*   **Geospatial Tools:** `@turf/turf` (Geometric math), `proj4` (Coordinate reprojection), `geotiff` (Raster parsing)

### Machine Learning Engine (Microservice)
*   **Framework:** Python, FastAPI, Uvicorn, Pydantic
*   **Computer Vision & Data Science:** `numpy`, `opencv-python-headless` (cv2), `rasterio` (Geospatial matrix extraction)
*   **Deep Learning / VLM:** `torch` (PyTorch with CUDA acceleration), `transformers` (Hugging Face AutoProcessor), `accelerate`
*   **Foundation Model:** `google/paligemma-3b-pt-224` (Optimized in float16 for VRAM preservation)

## 4. Implementation Details & Breakthroughs
*   **Strict DAG Engine:** By utilizing a graph execution model (`dependsOn` arrays), the system mathematically prevents out-of-order execution (e.g., trying to detect changes before rasters are fully read and normalized).
*   **Native GeoTIFF Handling:** Moving away from standard JPEGs, the system uses `rasterio` and `geotiff.js` to process true spatial coordinates embedded in the TIFF metadata.
*   **Bi-Temporal Matrix Differencing:** Instead of comparing vector bounding boxes, the Python ML engine extracts raw pixel values (e.g., Band 1 arrays) across temporal windows, computes the absolute difference, applies a statistical threshold `(mean + 2*std_dev)`, and translates the resulting anomalies back into spatial contours via OpenCV.
*   **PaliGemma Integration:** Implemented an optimized Hugging Face pipeline capable of processing multimodal remote sensing inputs natively without relying on generalized commercial web APIs, closing a major ISRO technical gap.
*   **Air-Gapped Compliance:** The structural refactor ensures files do not leave the local disk boundary for processing, successfully transitioning the app from a Cloud-API prototype to a true Local-First enterprise pipeline.
