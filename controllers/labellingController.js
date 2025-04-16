const { Storage } = require("@google-cloud/storage");
const bwipjs = require("bwip-js");

// Validate environment variables first
const bucketName = process.env.GCP_BUCKET_NAME;
const gcpSAKeyBase64 = process.env.GCP_SA_KEY_BASE64;
const projectId = process.env.GCP_PROJECT_ID;

if (!bucketName || !gcpSAKeyBase64 || !projectId) {
  throw new Error(
    "Missing GCP configuration in environment variables. Ensure GCP_BUCKET_NAME, GCP_SA_KEY_BASE64, and GCP_PROJECT_ID are set."
  );
}

// Parse service account credentials
let credentials;
try {
  const keyFileString = Buffer.from(gcpSAKeyBase64, "base64").toString("utf-8");
  credentials = JSON.parse(keyFileString);
} catch (error) {
  throw new Error("Failed to parse GCP service account key: " + error.message);
}

// Initialize Storage with credentials
const storage = new Storage({
  credentials,
  projectId,
});

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

        // Generate signed URL valid for 7 days
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        labels.push({ awb, labelUrl: signedUrl });
      } catch (error) {
        console.error(`Failed to generate label for AWB: ${awb}`, error.stack);
        labels.push({
          awb,
          labelUrl: null,
          error: error.message,
        });
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
    const { awb } = req.body;

    if (!awb) {
      return res.status(400).json({
        success: false,
        error: "AWB number is required.",
      });
    }

    const fileName = `labels/label-${awb}.png`;
    const file = storage.bucket(bucketName).file(fileName);

    const [fileExists] = await file.exists();
    if (!fileExists) {
      return res.status(404).json({
        success: false,
        error: "Barcode not found for the given AWB number.",
      });
    }

    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
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
