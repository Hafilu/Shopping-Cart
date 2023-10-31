const mongoose = require("mongoose");

// Define the product schema
const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  description: String,
});

// Create the Product model
const Product = mongoose.model("Product", productSchema);

// Define the user schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String, // Hashed password will be stored
  isadmin: Boolean, // Check this field
  cartId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cart", // Reference to the Cart model
  },
});

// Create the User model
const User = mongoose.model("User", userSchema);

// Define the cart schema
const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to the User model
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", // Reference to the Product model
      },
      quantity: Number,
    },
  ],
});

// Create the Cart model
const Cart = mongoose.model("Cart", cartSchema);

// cerate the order model
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  orderDetails: [{ productId: String, quantity: Number }],
  status: String, // Use "placed" for COD and "pending" for online payment (PayPal)
  totalAmount: Number, // Add a field to store the total order amount
  address: String, // Add a field to store the delivery address
  pin: String, // Add a field to store the pincode
  phone: String, // Add a field to store the mobile number
  paymentMethod:  String,
  // Add a field for the order date
  date: {
    type: Date,
    default: Date.now, // Set the default value to the current date and time
  }
});

const Order = mongoose.model("Order", orderSchema);

// Export all models
module.exports = {
  Product,
  User,
  Cart,
  Order,
};
