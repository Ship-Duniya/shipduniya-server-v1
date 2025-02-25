const Transaction = require("../models/Transaction");
const User = require("../models/User");

/**
 * Get all transactions of a user with optional filters, sorting, and pagination.
 */
const getAllTransactionsOfUser = async (req, res) => {
  const { id } = req.user; // Authenticated user ID
  const { type, page = 1, limit = 10 } = req.query; // Filters and pagination parameters

  try {
    // Build query filters
    const filters = { userId: id };
    if (type) {
      filters.type = type; // Filter by transaction type if provided
    }

    // Pagination options
    const options = {
      sort: { createdAt: -1 }, // Sort by latest first
      skip: (page - 1) * limit, // Calculate skip value
      limit: parseInt(limit, 10), // Limit the number of transactions per page
    };

    // Fetch transactions
    const transactions = await Transaction.find(filters, null, options);

    // Count total transactions for the user (for pagination metadata)
    const totalCount = await Transaction.countDocuments(filters);

    // Respond with transactions and pagination info
    res.status(200).json({
      totalTransactions: totalCount,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(totalCount / limit),
      transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Error fetching transactions", error });
  }
};

/**
 * Get all transactions grouped by user (for admin and superadmin).
 */
// const getAllTransactionsGroupedByUser = async (req, res) => {
//   try {
//     const usersWithTransactions = await Transaction.aggregate([
//       {
//         $group: {
//           _id: "$userId", // Group by userId
//           transactions: { $push: "$$ROOT" }, // Collect all transactions for each user
//         },
//       },
//       {
//         $lookup: {
//           from: "users", // Lookup user details from the users collection
//           localField: "_id",
//           foreignField: "_id",
//           as: "userDetails",
//         },
//       },
//       {
//         $unwind: "$userDetails", // Unwind userDetails array to get individual objects
//       },
//     ]);

//     // Respond with grouped transactions
//     res.status(200).json({
//       totalUsersWithTransactions: usersWithTransactions.length,
//       usersWithTransactions,
//     });
//   } catch (error) {
//     console.error("Error fetching transactions grouped by user:", error);
//     res.status(500).json({ message: "Error fetching transactions", error });
//   }
// };

//above code is more correct --> by subhajit on 29-07-2025
const getAllTransactionsGroupedByUser = async (req, res) => {
  try {
    // Fetch transactions with user details
    const transactions = await Transaction.aggregate([
      {
        $lookup: {
          from: "users", // Lookup user details from the users collection
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user", // Unwind user array to get individual objects
      },
      {
        $addFields: {
          userName: "$user.name", // Add userName field from the user collection
        },
      },
      {
        $project: {
          user: 0, // Remove full user details
        },
      },
    ]);

    if (!transactions.length) {
      return res.status(404).json({ message: "No transactions found" });
    }

    // Respond with the transactions
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Error fetching transactions", error });
  }
};

module.exports = { getAllTransactionsOfUser, getAllTransactionsGroupedByUser };
