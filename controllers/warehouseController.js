const Warehouse = require("../models/wareHouse"); // Adjust path as needed
const User = require("../models/User"); // Adjust path as needed

const createWarehouse = async (req, res) => {
  try {
    // Fetch userId from req.user.id
    const userId = req.user.id;

    // Extract other warehouse data from the request body
    const { name, address, pincode, capacity, managerName, managerMobile } =
      req.body;

    // Create a new warehouse
    const newWarehouse = new Warehouse({
      name,
      address,
      pincode,
      capacity,
      managerName,
      managerMobile,
    });

    // Save the warehouse
    const savedWarehouse = await newWarehouse.save();

    // Add warehouse reference to the user's warehouses array
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.warehouses.push(savedWarehouse._id);
    await user.save();

    return res.status(201).json({
      message: "Warehouse created and added to user",
      warehouse: savedWarehouse,
    });
  } catch (error) {
    console.error("Error creating warehouse:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const editWarehouse = async (req, res) => {
  try {
    // Validate that the request contains a valid user ID
    if (!req.user || !req.user.id) {
      return res
        .status(400)
        .json({ message: "Invalid request: User ID is missing" });
    }

    const { warehouseId } = req.params;
    const { name, location, capacity, managerName, managerMobile } = req.body; // Example fields for a warehouse

    // Validate the input fields
    if (!warehouseId) {
      return res.status(400).json({ message: "Warehouse ID must be provided" });
    }

    // Find the user and the warehouse to edit
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const warehouse = user.warehouses.find(
      (warehouse) => warehouse._id.toString() === warehouseId
    );

    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    // Update the warehouse fields
    if (name) warehouse.name = name;
    if (location) warehouse.location = location;
    if (capacity) warehouse.capacity = capacity;
    if (managerName) warehouse.managerName = managerName;
    if (managerMobile) warehouse.managerMobile = managerMobile;

    await user.save();

    return res.status(200).json({
      message: "Warehouse updated successfully",
      warehouse,
    });
  } catch (error) {
    console.error("Error updating warehouse:", error.message);
    return res.status(500).json({
      message: "An error occurred while updating the warehouse",
      error: error.message,
    });
  }
};

const fetchAllWarehouses = async (req, res) => {
  try {
    // Validate that the request contains a valid user ID
    if (!req.user || !req.user.id) {
      return res
        .status(400)
        .json({ message: "Invalid request: User ID is missing" });
    }

    // Find the user by ID and populate the warehouses field
    const user = await User.findById(req.user.id).populate("warehouses"); // Populate the warehouses field

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Warehouses fetched successfully",
      warehouses: user.warehouses, // populated warehouses
    });
  } catch (error) {
    console.error("Error fetching warehouses:", error.message);
    return res.status(500).json({
      message: "An error occurred while fetching the warehouses",
      error: error.message,
    });
  }
};

const deleteWarehouse = async (req, res) => {
  try {
    // Validate that the request contains a valid user ID
    if (!req.user || !req.user.id) {
      return res
        .status(400)
        .json({ message: "Invalid request: User ID is missing" });
    }

    const { warehouseId } = req.params;

    // Validate the input fields
    if (!warehouseId) {
      return res.status(400).json({ message: "Warehouse ID must be provided" });
    }

    // Find the user and remove the warehouse
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const warehouseIndex = user.warehouses.findIndex(
      (warehouse) => warehouse._id.toString() === warehouseId
    );

    if (warehouseIndex === -1) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    // Remove the warehouse from the array
    user.warehouses.splice(warehouseIndex, 1);

    await user.save();

    return res.status(200).json({
      message: "Warehouse deleted successfully",
      warehouses: user.warehouses,
    });
  } catch (error) {
    console.error("Error deleting warehouse:", error.message);
    return res.status(500).json({
      message: "An error occurred while deleting the warehouse",
      error: error.message,
    });
  }
};

module.exports = {
  createWarehouse,
  editWarehouse,
  fetchAllWarehouses,
  deleteWarehouse,
};
