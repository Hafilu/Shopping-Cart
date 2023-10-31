const { User, Cart, Product, Order } = require("../config/mongoose-schema");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");
const Razorpay = require("razorpay");


// Initialize Razorpay with your API key and secret
const razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

(exports.registerUser =
  // Function to handle user registration
  async (req, res) => {
    try {
      // Extract user data from the request body
      const { name, email, password } = req.body;

      // Check if the email already exists in the database
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        console.log("existing user");
        return;
      }

      // Hash the user's password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user document
      const newUser = new User({ name, email, password: hashedPassword });

      // Save the user to the database
      await newUser.save();

      // Respond with a success message

      console.log("Registered successfully");
      return newUser;
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }),
  (exports.loginUser = async (req) => {
    try {
      // Extract user data from the request body
      const { email, password } = req.body;

      // Log the received email for debugging
      console.log("Received email:", email);

      // Find the user by email
      const newUser = await User.findOne({ email });
      console.log(newUser);
      if (!newUser) {
        console.log("User not found for email:", email);
        return false; // Return false for failed login
      }

      // Compare the provided password with the hashed password in the database
      const passwordMatch = await bcrypt.compare(password, newUser.password);

      if (!passwordMatch) {
        console.log("Invalid password for email:", email);
        return false; // Return false for failed login
      } else {
        // If login is successful, generate a JWT token
        const token = jwt.sign({ userId: newUser.id }, process.env.SECRET_KEY, {
          expiresIn: "1h",
        });

        console.log("token: ", token);
        console.log("Login success for email:", email);
        const loggedUser = { user: newUser, token: token };
        return loggedUser; // Return the token for successful login
      }
    } catch (error) {
      console.error("Error logging in user:", error);
      return false; // Return false for failed login
    }
  });

// Function to add a product to the cart
exports.addToCart = async (userId, productId) => {
  try {
    // Find the user's cart or create a new one if it doesn't exist
    let cart = await Cart.findOne({ userId });
    console.log("add to cart finding cart", cart);
    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    // Check if the product is already in the cart, and update the quantity
    const productIndex = cart.products.findIndex(
      (product) => product.productId == productId
    );

    if (productIndex !== -1) {
      cart.products[productIndex].quantity++;
    } else {
      // If not, add the product to the cart
      cart.products.push({ productId, quantity: 1 });
    }

    await cart.save();

    return cart; // You can return the updated cart or a success message if needed
  } catch (error) {
    // Handle any errors that may occur during the operation
    throw error;
  }
};

// Function to retrieve user's cart data from the database
exports.getUserCartData = async (userId) => {
  try {
    // Find the user's cart based on the user's reference in the cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      // Handle the case where the user's cart is not found
      return null;
    }

    // Return the user's cart data
    return cart;
  } catch (error) {
    // Handle any errors that may occur during the database query
    throw error;
  }
};

exports.getProductDetailsFromCart = async (cart) => {
  try {
    // Extract unique product IDs from the user's cart as strings
    const productIds = [
      ...new Set(cart.map((item) => item.productId.toString())),
    ];

    // Use Mongoose to find products by their IDs
    const products = await Product.find({ _id: { $in: productIds } });

    // Create a mapping of product IDs to product details
    const productDetailsMap = {};
    products.forEach((product) => {
      productDetailsMap[product._id.toString()] = product;
    });

    // Create an array of product details based on the user's cart order
    const productDetailsInCart = cart.map((item) => {
      const product = productDetailsMap[item.productId.toString()];
      if (product) {
        return {
          ...product.toObject(), // Convert Mongoose document to plain JavaScript object
          quantity: item.quantity,
        };
      } else {
        return null; // Handle the case where a product is not found
      }
    });

    return productDetailsInCart;
  } catch (error) {
    // Handle any errors that may occur during the retrieval
    throw error;
  }
};

// Function to get the count of items in the user's cart
exports.getCartCount = async (userId) => {
  try {
    // Find the user's cart based on the user's reference in the cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      // Handle the case where the user's cart is not found
      return 0;
    }

    // Calculate the total count of items in the cart
    let totalCount = 0;
    cart.products.forEach((item) => {
      totalCount += item.quantity;
    });

    return totalCount;
  } catch (error) {
    // Handle any errors that may occur during the database query
    throw error;
  }
};

// Function to change the quantity of a product in the cart
exports.changeCartItemQuantity = async (userId, productId, quantityChange) => {
  try {
    // Find the user's cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      throw new Error("User cart not found");
    }

    // Find the index of the product in the cart
    const productIndex = cart.products.findIndex(
      (product) => product.productId.toString() === productId
    );
    console.log("index", productIndex);
    if (productIndex !== -1) {
      // If the product is found, update its quantity
      const updatedQuantity =
        parseInt(cart.products[productIndex].quantity) +
        parseInt(quantityChange);

      // Ensure the quantity doesn't go below 1
      cart.products[productIndex].quantity = Math.max(updatedQuantity, 1);

      // Save the updated cart
      await cart.save();
      console.log("new qty", updatedQuantity);
      // Return only the updated quantity
      return { success: true, quantity: cart.products[productIndex].quantity };
    } else {
      throw new Error("Product not found in cart");
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.removeProductFromCart = async (userId, productId) => {
  try {
    // Find the user's cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      throw new Error("User cart not found");
    }

    // Find the index of the product in the cart
    const productIndex = cart.products.findIndex(
      (product) => product.productId.toString() === productId
    );

    if (productIndex !== -1) {
      // If the product is found, remove it from the cart
      cart.products.splice(productIndex, 1);
      await cart.save();
      return { success: true };
    } else {
      throw new Error("Product not found in cart");
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Function to get the total amount in the user's cart
exports.getTotalCartAmount = async (userId) => {
  try {
    // Find the user's cart based on the user's reference in the cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      // Handle the case where the user's cart is not found
      return 0;
    }

    // Get the product details from the cart
    const productDetailsInCart = await exports.getProductDetailsFromCart(
      cart.products
    );

    let totalAmount = 0;

    // Iterate through the product details in the cart
    for (const item of productDetailsInCart) {
      if (item) {
        // Calculate the subtotal for this product (price * quantity)
        const subtotal = item.price * item.quantity;
        totalAmount += subtotal;
      }
    }

    return totalAmount;
  } catch (error) {
    // Handle any errors that may occur during the database query
    throw error;
  }
};

exports.placeOrder = async (userId, address, pin, phone, paymentMethod) => {
  try {
    // Calculate the total order amount based on the cart
    const cart = await Cart.findOne({ userId });
    const totalAmount = await exports.getTotalCartAmount(userId);

    // Create a new order document
    const order = new Order({
      userId,
      orderDetails: cart.products.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
      })),
      status: paymentMethod === "cashOnDelivery" ? "placed" : "pending",
      totalAmount, // Add the total order amount
      address, // Add the delivery address
      pin, // Add the pincode
      phone, // Add the mobile number
      paymentMethod
      // You can add other order details here (e.g., date, paymentMethod, etc.)
    });

    // Save the order to the database
    await order.save();

    // Clear the user's cart after placing the order
    if (cart) {
      cart.products = [];
      await cart.save();
    }
    // Return a success message or order ID
    return order;
  } catch (error) {
    // Handle any errors that may occur during order placement
    throw error;
  }
};


// Helper function to generate a Razorpay order
exports.generateRazorPay = async (orderId, amountInPaise) => {
  try {
    const options = {
      amount: amountInPaise, // Amount in paise (e.g., 1000 for ₹10.00)
      currency: "INR", // Currency code (INR for Indian Rupees)
      receipt: orderId, // Unique identifier for the order
      payment_capture: 1, // Auto-capture the payment after order creation
    };

    // Create a Razorpay order
    const razorpayOrder = await razorpay.orders.create(options);
    console.log("razorpay order", razorpayOrder);
    return razorpayOrder;
  } catch (error) {
    // Handle any errors that may occur during Razorpay order creation
    throw error;
  }
};



exports.updateOrderStatus= async(orderId, newStatus)=> {
  try {
    await Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { status: newStatus } }
    );
    return true; // Return true if the update was successful
  } catch (error) {
    console.error("Error updating order status:", error);
    return false; // Return false if there was an error
  }
}


