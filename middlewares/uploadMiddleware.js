const multer = require("multer");

const storage = multer.memoryStorage(); // Store the file in memory
const upload = multer({ storage: storage });

module.exports = upload;
