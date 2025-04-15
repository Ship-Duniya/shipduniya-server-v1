const { Storage } = require("@google-cloud/storage");
const bwipjs = require("bwip-js");
const path = require("path");

// Parse the GCP_KEY_JSON environment variable as JSON
let keyJson;
try {
  keyJson = JSON.parse(process.env.GCP_KEY_JSON);
} catch (error) {
  console.error("Failed to parse GCP_KEY_JSON:", error.message);
  throw new Error("Invalid GCP_KEY_JSON environment variable. Ensure it contains valid JSON.");
}

const storage = new Storage({
  credentials: keyJson,
  projectId: process.env.GCP_PROJECT_ID,
});

const bucketName = process.env.GCP_BUCKET_NAME;

if (!bucketName) {
  throw new Error("GCP bucket name is missing in environment variables.");
}

const generateBulkLabels = async (req, res) => {
  try {
    const { awbNumbers } = req.body;

    if (!awbNumbers || !Array.isArray(awbNumbers) || awbNumbers.length === 0) {
      return res.status(400).json({
        error: "Invalid AWB numbers format. Expected a non-empty array.",
      });
    }

    const labels = [];

    for (const awb of awbNumbers) {
      try {
        const fileName = `labels/label-${awb}.png`;
        const file = storage.bucket(bucketName).file(fileName);

        const [fileExists] = await file.exists();
        if (!fileExists) {
          const barcodeBuffer = await bwipjs.toBuffer({
            bcid: "code128",
            text: awb,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: "center",
            backgroundcolor: "FFFFFF",
          });

          await file.save(barcodeBuffer, {
            metadata: { contentType: "image/png" },
          });
        }

        // Generate a signed URL for temporary access (valid for 7 days)
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
        });

        labels.push({ awb, labelUrl: signedUrl });
      } catch (error) {
        console.error(`Failed to generate label for AWB: ${awb}`, error.stack);
        labels.push({ awb, labelUrl: null, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: "Barcode images generated successfully.",
      labels,
    });
  } catch (error) {
    console.error("Error generating labels:", error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to generate barcode images.",
      details: error.message,
    });
  }
};

const getBarcodeUrl = async (req, res) => {
  try {
    const { awb } = req.body; // Get AWB number from query params

    if (!awb) {
      return res.status(400).json({
        success: false,
        error: "AWB number is required.",
      });
    }

    const fileName = `labels/label-${awb}.png`;
    const file = storage.bucket(bucketName).file(fileName);

    // Check if the file exists
    const [fileExists] = await file.exists();

    if (!fileExists) {
      return res.status(404).json({
        success: false,
        error: "Barcode not found for the given AWB number.",
      });
    }

    // Generate a signed URL (valid for 7 days)
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      awb,
      barcodeUrl: signedUrl,
    });
  } catch (error) {
    console.error("Error fetching barcode URL:", error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve barcode URL.",
      details: error.message,
    });
  }
};

module.exports = { generateBulkLabels, getBarcodeUrl };
