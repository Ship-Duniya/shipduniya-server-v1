const fs = require("fs");
const PDFDocument = require("pdfkit");
const path = require("path");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

const generateInvoiceNumber = (year, month) => {
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `INV-${year}${month}-${randomNum}`;
};

const getMonthName = (month) => {
  return new Date(2025, month - 1, 1).toLocaleString("default", { month: "long" });
};

const generateMonthlyInvoice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.params;

    if (!userId || !month || !year) {
      return res.status(400).json({ error: "User ID, month, and year are required" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const transactions = await Transaction.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    if (transactions.length === 0) {
      return res.status(404).json({ error: "No transactions found for this period" });
    }

    // ✅ Ensure invoices directory exists
    const invoiceDir = path.join(__dirname, "../invoices");
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }

    // ✅ Generate invoice details
    const monthName = getMonthName(month);
    const invoiceNumber = generateInvoiceNumber(year, month);
    const invoiceFileName = `invoice_${userId}_${year}_${month}.pdf`;
    const invoicePath = path.join(invoiceDir, invoiceFileName);

    // ✅ Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(invoicePath);
    doc.pipe(writeStream);

    // ✅ Header (Company Name & Address)
    doc
      .fontSize(20)
      .fillColor("#007BFF") // Blue header
      .text("Ship Duniya", { align: "center" })
      .moveDown(0.5)
      .fontSize(12)
      .fillColor("#444444")
      .text("C 45 GROUND FLOOR SECTOR 10 NOIDA,", { align: "center" })
      .text("NOIDA, Uttar Pradesh 201301, India", { align: "center" })
      .moveDown(0.5)
      .fillColor("black");

    // ✅ Invoice Details
    doc
      .fontSize(16)
      .fillColor("#007BFF")
      .text("Invoice", { align: "center" })
      .moveDown()
      .fillColor("black")
      .fontSize(12)
      .text(`Invoice Number: ${invoiceNumber}`)
      .text(`User Name: ${user.name}`)
      .text(`User Email: ${user.email}`)
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`)
      .text(`Billing Period: ${monthName} ${year}`)
      .moveDown();

    // ✅ Table Header
    doc
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .rect(50, doc.y, 500, 25) // Header background
      .fill("#F1F1F1") // Light grey background
      .stroke()
      .fillColor("black")
      .text("Date", 55, doc.y + 5)
      .text("Type", 200, doc.y + 5)
      .text("Amount (INR)", 350, doc.y + 5)
      .text("Status", 500, doc.y + 5)
      .moveDown()
      .fillColor("black");

    let tableY = doc.y + 5; // Adjust row spacing

    // ✅ Table Rows
    transactions.forEach((txn) => {
      doc
        .fillColor("#000000")
        .rect(50, tableY, 500, 20)
        .fill("#FFFFFF") // White background for rows
        .stroke()
        .fillColor("black")
        .text(new Date(txn.createdAt).toLocaleDateString(), 55, tableY + 5)
        .text(txn.type.join(", "), 200, tableY + 5)
        .text(`₹ ${txn.amount.toFixed(2)}`, 350, tableY + 5)
        .text(txn.status.toUpperCase(), 500, tableY + 5);

      tableY += 25; // Increase spacing for next row
    });

    // ✅ Total Amount
    const totalAmount = transactions.reduce((sum, txn) => sum + txn.amount, 0);
    doc
      .moveDown()
      .font("Helvetica-Bold")
      .fillColor("#007BFF")
      .text(`Total: ₹ ${totalAmount.toFixed(2)}`, { align: "right" });

    // ✅ Footer
    doc
      .moveDown(2)
      .fontSize(10)
      .fillColor("#444444")
      .text("Thank you for using our service!", { align: "center" });

    // ✅ Finalize PDF
    doc.end();

    // ✅ Wait for file write completion before sending response
    writeStream.on("finish", () => {
      setTimeout(() => {
        res.download(invoicePath, invoiceFileName, (err) => {
          if (err) {
            console.error("❌ Error sending invoice:", err);
            res.status(500).json({ error: "Error generating invoice" });
          }
        });
      }, 500);
    });

  } catch (error) {
    console.error("❌ Error generating invoice:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = generateMonthlyInvoice;
