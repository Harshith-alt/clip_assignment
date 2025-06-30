const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");
const app = express();
require("dotenv").config();

// Configuration
const VIEWPORT = { width: 1280, height: 800 };
const MAX_IMAGE_SIZE_KB = 500;

app.use(express.json({ limit: "10mb" }));
app.use(cors({ origin: "http://localhost:3000" }));

/**
 * Convert URL to shareable image
 */
app.post("/convert", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !isValidUrl(url)) {
      return res.status(400).json({
        error: "Please provide a valid URL (e.g., https://example.com)",
      });
    }

    console.log(`Processing: ${url}`);

    // 1. Capture optimized screenshot
    const { screenshot, metrics } = await captureWebpage(url);
    console.log(`Screenshot captured (${metrics.sizeKB}KB)`);

    // 2. Return base64 for plugins or upload to Imgur
    res.json({
      success: true,
      imageBase64: screenshot,
      metrics,
      instructions: "Use with Figma plugin or paste into image tool",
    });
  } catch (error) {
    console.error("Conversion failed:", error.message);
    res.status(500).json({
      error: error.message,
      details: error.response?.data || null,
    });
  }
});

/**
 * Capture webpage with Puppeteer
 */
async function captureWebpage(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    await page.setViewport(VIEWPORT);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Get scroll dimensions
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));

    const clip = {
      x: 0,
      y: 0,
      width: Math.min(VIEWPORT.width, dimensions.width),
      height: Math.min(VIEWPORT.height, dimensions.height),
    };

    // First try JPEG with quality adjustment
    // First try JPEG with quality adjustment
    let screenshot;
    let format = "jpeg";
    let quality = 80;

    try {
      screenshot = await page.screenshot({
        type: "jpeg",
        quality: quality,
        encoding: "base64",
        clip: clip,
      });
    } catch (e) {
      console.log("JPEG capture failed, trying PNG");
      screenshot = await page.screenshot({
        type: "png",
        encoding: "base64",
        clip: clip,
      });
      format = "png";
      quality = undefined;
    }

    const sizeKB = Buffer.byteLength(screenshot, "base64") / 1024;
    if (sizeKB > MAX_IMAGE_SIZE_KB) {
      throw new Error(
        `Image too large (${Math.round(sizeKB)}KB). Try a smaller viewport.`
      );
    }

    return {
      screenshot,
      metrics: {
        sizeKB: Math.round(sizeKB),
        dimensions: `${dimensions.width}x${dimensions.height}`,
        format: format,
        quality: quality,
      },
    };
  } finally {
    await browser.close();
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  console.log(`Configured viewport: ${VIEWPORT.width}x${VIEWPORT.height}`);
});

// const express = require("express");
// const puppeteer = require("puppeteer");
// const axios = require("axios");
// const app = express();
// require("dotenv").config();

// // Configuration
// const FIGMA_API = "https://api.figma.com/v1";
// const VIEWPORT = { width: 1280, height: 800 };

// app.use(express.json());

// // Convert URL to interactive Figma prototype
// app.post("/convert", async (req, res) => {
//   const { url } = req.body;

//   try {
//     // 1. Capture and analyze webpage
//     const { screenshot, elements } = await analyzeWebpage(url);

//     // 2. Upload image to Figma
//     const imageHash = await uploadImageToFigma(screenshot);

//     // 3. Create interactive prototype
//     const prototypeUrl = await createFigmaPrototype(url, imageHash, elements);

//     res.json({
//       success: true,
//       figmaUrl: prototypeUrl,
//       elementsDetected: elements.length,
//       stats: {
//         hotspots: elements.length,
//         screenshotSize: `${
//           Math.round(Buffer.from(screenshot, "base64").length) / 1024
//         }KB`,
//       },
//     });
//   } catch (error) {
//     console.error("Conversion error:", error);
//     res.status(500).json({
//       error: "Conversion failed",
//       details: error.message,
//     });
//   }
// });

// // Webpage analysis with Puppeteer
// async function analyzeWebpage(url) {
//   const browser = await puppeteer.launch({ headless: "new" });
//   const page = await browser.newPage();

//   try {
//     await page.setViewport(VIEWPORT);
//     await page.goto(url, { waitUntil: "networkidle2" });

//     // Get all interactive elements
//     const elements = await page.evaluate(() => {
//       return Array.from(
//         document.querySelectorAll("a, button, [role=button]")
//       ).map((el) => {
//         const rect = el.getBoundingClientRect();
//         return {
//           x: rect.x,
//           y: rect.y,
//           width: rect.width,
//           height: rect.height,
//           text: el.innerText?.slice(0, 50),
//           tag: el.tagName,
//         };
//       });
//     });

//     // Capture screenshot
//     const screenshot = await page.screenshot({ encoding: "base64" });

//     return { screenshot, elements };
//   } finally {
//     await browser.close();
//   }
// }

// // Upload image to Figma
// async function uploadImageToFigma(base64Image) {
//   const response = await axios.post(
//     `${FIGMA_API}/images`,
//     { image: base64Image },
//     { headers: { "X-Figma-Token": process.env.FIGMA_TOKEN } }
//   );
//   return response.data.meta.images[0];
// }

// // Create Figma prototype
// async function createFigmaPrototype(url, imageHash, elements) {
//   // Create main frame with screenshot
//   const mainFrame = {
//     type: "FRAME",
//     name: "Webpage",
//     children: [
//       {
//         type: "RECTANGLE",
//         fills: [{ type: "IMAGE", imageHash, scaleMode: "FILL" }],
//         size: { x: VIEWPORT.width, y: VIEWPORT.height },
//       },
//       // Add interactive hotspots
//       ...elements.map((el, i) => ({
//         type: "FRAME",
//         name: `Hotspot-${i}-${el.tag}`,
//         absoluteBoundingBox: {
//           x: el.x,
//           y: el.y,
//           width: el.width,
//           height: el.height,
//         },
//         fills: [{ type: "SOLID", opacity: 0 }], // Invisible
//         prototype: {
//           transition: { type: "DISSOLVE", duration: 0.3 },
//           destination: `Page-${i}`,
//         },
//       })),
//     ],
//   };

//   // Create destination frames
//   const destinationFrames = elements.map((_, i) => ({
//     type: "FRAME",
//     name: `Page-${i}`,
//     // Additional content would go here
//   }));

//   // Create Figma file
//   const response = await axios.post(
//     `${FIGMA_API}/files`,
//     {
//       name: `Prototype: ${new URL(url).hostname}`,
//       nodes: [mainFrame, ...destinationFrames],
//     },
//     { headers: { "X-Figma-Token": process.env.FIGMA_TOKEN } }
//   );

//   return `https://figma.com/file/${response.data.key}`;
// }

// app.listen(5000, () => console.log("Server ready on port 5000"));
