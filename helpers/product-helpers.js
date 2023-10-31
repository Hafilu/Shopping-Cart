const { Product } = require("../config/mongoose-schema");
const { User, Order } = require("../config/mongoose-schema");
const bcrypt = require("bcrypt");

exports.authenticateAdmin = async (username, password) => {
  try {
    // Query the user by username
    const user = await User.findOne({ name: username });

    if (!user) {
      // User not found
      console.log("User not found");
      return null;
    }
    console.log("admin", user.isadmin);

    // Check if the user is an admin
    if (user.isadmin) {
      // Compare the provided password with the stored hash using bcrypt
      const passwordMatch = await bcrypt.compare(password, user.password);

      console.log("Entered Username:", username);
      console.log("Entered Password:", password);

      if (passwordMatch) {
        // Passwords match, admin authentication succeeded
        console.log("Admin authentication succeeded");
        return username;
      } else {
        // Passwords do not match, admin authentication failed
        console.log("Admin authentication failed");
        return null;
      }
    } else {
      // User is not an admin
      console.log("You are not an admin");
      return null;
    }
  } catch (error) {
    // Handle any errors that may occur during the authentication process
    console.error("Error during admin authentication:", error);
    throw error;
  }
};

exports.addProduct = async (req, res) => {
  const { name, category, price, description } = req.body;
  const newProduct = new Product({ name, category, price, description });

  // Handle file upload
  if (req.files && req.files.image) {
    const productImage = req.files.image;

    // Save the product first
    const savedProduct = await newProduct.save();

    // Construct the image path using the product's _id
    const imagePath = `public/product-images/${savedProduct._id.toString()}.jfif`;

    // Move the uploaded image to the product-images folder
    productImage.mv(imagePath, (err) => {
      if (err) {
        console.error(err);
        // Handle error as needed
      } else {
        console.log("Image saved successfully:", imagePath);

        // Update the product's image path in the database
        savedProduct.image = imagePath;

        // Save the product again to update the image path
        savedProduct
          .save()
          .then(() => {
            console.log("Product saved successfully:", savedProduct);
            res.redirect("/admin/add-product");
          })
          .catch((err) => {
            console.error("Error saving product:", err);
            res.redirect("/admin/add-product");
          });
      }
    });
  } else {
    // No image uploaded, save the product without an image path
    newProduct
      .save()
      .then((savedProduct) => {
        console.log("Product saved successfully:", savedProduct);
        res.redirect("/admin/add-product");
      })
      .catch((err) => {
        console.error("Error saving product:", err);
        res.redirect("/admin/add-product");
      });
  }
};

exports.getAllProducts = async () => {
  try {
    // Use the find method to retrieve all products
    const products = await Product.find({});

    // Return the products
    return products;
  } catch (error) {
    // Handle any errors that may occur during the query
    throw error;
  }
};

// Function to delete a product by ID
exports.deleteProduct = async (productId) => {
  try {
    // Use mongoose.Types.ObjectId directly
    //const objectId = mongoose.Types.ObjectId(productId);

    // Use the findByIdAndRemove method to delete the product by its ObjectId
    const deletedProduct = await Product.findByIdAndRemove(productId);

    if (!deletedProduct) {
      // If the product was not found, return an error message
      return { error: "Product not found" };
    }

    // Delete the corresponding product image (if it exists)
    const imagePath = `public/product-images/${productId}.jpg`;

    // Use a file system library to remove the image file
    // Example using Node.js built-in 'fs' module:
    const fs = require("fs");
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Return a success message
    return { message: "Product deleted successfully" };
  } catch (error) {
    // Handle any errors that may occur during the delete operation
    throw error;
  }
};

// Function to edit product details by ID
exports.editProductDetails = async (productId) => {
  try {
    // Find the product by its ID
    const product = await Product.findById(productId);

    if (!product) {
      // If the product was not found, return an error message
      return { error: "Product not found" };
    }

    // Return the updated product
    return product;
  } catch (error) {
    // Handle any errors that may occur during the update operation
    throw error;
  }
};

// Function to update a product by ID
exports.updateProduct = async (productId, updatedProductData) => {
  try {
    // Use the findByIdAndUpdate method to update the product by its ObjectId
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updatedProductData,
      { new: true } // Set { new: true } to return the updated product
    );

    if (!updatedProduct) {
      // If the product was not found, return an error message
      return { error: "Product not found" };
    }

    // Return the updated product
    return updatedProduct;
  } catch (error) {
    // Handle any errors that may occur during the update operation
    throw error;
  }
};

// Helper function to get all orders
exports.getAllOrders = async () => {
  try {
    const orders = await Order.find();
    // Transform the data for Handlebars template
    const transformedOrders = orders.map((order) => ({
      _id: order._id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      address: order.address,
      pin: order.pin,
      phone: order.phone,
      paymentMethod: order.paymentMethod,
      date: new Date(order.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }));

    return { success: true, data: transformedOrders.reverse() };
  } catch (error) {
    return { success: false, error: "Failed to fetch orders." };
  }
};

// Helper function to delete an order
exports.deleteOrder = async (orderId) => {
  try {
    await Order.findByIdAndDelete(orderId);
    return { success: true, message: "Order deleted successfully." };
  } catch (error) {
    return { success: false, error: "Failed to delete the order." };
  }
};

// Helper function to update the status of an order
exports.updateOrderStatus = async (orderId, newStatus) => {
  try {
    await Order.findByIdAndUpdate(orderId, { status: newStatus });
    return { success: true, message: "Order status updated successfully." };
  } catch (error) {
    return { success: false, error: "Failed to update order status." };
  }
};

// Helper function to get all orders
exports.getAllUsers = async () => {
  try {
    const users = await User.find();
    // Transform the data for Handlebars template
    const transformedUsers = users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
    }));

    return { success: true, data: transformedUsers.reverse() };
  } catch (error) {
    return { success: false, error: "Failed to fetch orders." };
  }
};

exports.removeUser = async (userId) => {
  try {
    // Find the user's cart
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      throw new Error("User not found");
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
