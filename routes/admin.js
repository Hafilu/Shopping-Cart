var express = require('express');
var router = express.Router();
var productHelpers = require("../helpers/product-helpers")

// Middleware to check if the user is authenticated as an admin
const isAdminAuthenticated = (req, res, next) => {
  if (req.session.admin) {
    // The user is authenticated as an admin, continue with the next route
    return next();
  } else {
    // Redirect to the admin login page or handle unauthorized access
    res.redirect('/admin/admin-login');
  }
};

/* GET users listing. */
router.get('/',isAdminAuthenticated,async function(req, res, next) {
  try {
    
    const products = await productHelpers.getAllProducts();

    function transformProductsForTemplate(products) {
      return products.map((product, index) => ({
        index: index + 1,
        name: product.name,
        category: product.category,
        price:product.price,
        description: product.description,
        id:product._id.toString()
      }));
    }
    
    const transformedProducts = transformProductsForTemplate(products);

    // Render the Handlebars template with the transformed data
    res.render("admin/view-products", { admin: true, products: transformedProducts, adminStatus:req.session.admin });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/add-product",isAdminAuthenticated, function(req,res){
  res.render("admin/add-product", {admin:true,adminStatus:req.session.admin })
})
router.post("/add-product", productHelpers.addProduct,function(req,res){
  console.log(req.body);
  console.log(req.files.image);

})

router.get("/delete-product/:id",isAdminAuthenticated, async (req, res) => {
  try {
    const productId = req.params.id;

    // Call the deleteProduct function with the productId
    const result = await productHelpers.deleteProduct(productId);

    // Check if the result contains an error message
    if (result.error) {
      // Handle the error (e.g., product not found)
      console.log("error in deleting");
    } else {
      // Product was deleted successfully
      res.redirect("/admin");
    }
  } catch (error) {
    // Handle any other errors that may occur during the delete operation
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/edit-product/:id",isAdminAuthenticated, async (req, res) => {
  try {
    const productId = req.params.id;

    // Call the editProductDetails function to get the product details by ID
    const product = await productHelpers.editProductDetails(productId);
    function transformProductsForTemplate(product) {
      const editProduct = {
         
        name: product.name,
        category: product.category,
        price:product.price,
        description: product.description,
        id:product._id.toString()
      }
      return editProduct;
    }
    
    const transformedProducts = transformProductsForTemplate(product);

    console.log("edit product details", product);
    if (product.error) {
      // Handle the case where the product is not found
      res.redirect("/admin"); // Redirect to the admin dashboard or handle it as needed
    } else {
      res.render("admin/edit-product", { admin: true, editProduct:transformedProducts,adminStatus:req.session.admin  });
    }
  } catch (error) {
    console.error("Error editing product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/edit-product/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const updatedProductData = req.body; // Assuming the updated data is sent in the request body
    
    const updatedProduct = await productHelpers.updateProduct(
      productId,
      updatedProductData
    );

    if (updatedProduct.error) {
      // Handle the error, e.g., product not found
      console.log("updation failed");
      res.redirect("/admin"); // Redirect to admin page or show an error message
      return; // Return early to avoid sending multiple responses
    }

    // Handle the successful update, e.g., redirect to product details page
    if (req.files.image) {
      const image = req.files.image;
      const imagePath = `public/product-images/${productId}.jpg`;
      image.mv(imagePath, (err) => {
        if (err) {
          console.error(err);
          // Handle the error as needed
        } else {
          console.log("New image saved successfully:", imagePath);
          res.redirect("/admin");
        }
      });
    } else {
      res.redirect("/admin");
    }
  } catch (error) {
    // Handle any other errors that may occur
    console.error("Error updating product:", error);
    res.redirect("/admin"); // Redirect to admin page or show an error message
  }
});

router.get("/admin-login",(req,res)=>{
  res.render("admin/login",{admin:true})
})

// Admin authentication route
router.post('/admin-login', async (req, res) => {
  const { username, password } = req.body;

  // Authenticate the admin using the helper function
  const admin = await productHelpers.authenticateAdmin(username, password);

  if (admin) {
    // Admin authentication succeeded
    req.session.admin = admin; // Set a session variable to indicate admin login
    res.redirect('/admin'); // Redirect to the admin dashboard or the desired page
  } else {
    // Admin authentication failed
    res.render('admin/login', { admin: true, loginErr: 'Invalid credentials. Please try again.' });
  }
});


// Admin logout route
router.get('/admin-logout', (req, res) => {
  req.session.admin = false; // Clear the admin session variable
  res.redirect('/admin'); // Redirect to the admin login page after logout
});


// Route to display all orders in the admin panel
router.get('/all-orders',isAdminAuthenticated, async (req, res) => {
  try {
    const ordersResponse = await productHelpers.getAllOrders();
    if (ordersResponse.success) {
      const orders = ordersResponse.data;
      res.render('admin/all-orders', { orders, admin: true, adminStatus: req.session.admin });
    } else {
      console.log(ordersResponse.error);
      res.redirect('/admin/all-orders');
    }
  } catch (error) {
    console.log('error', 'Failed to fetch orders.');
    res.redirect('/admin/all-orders');
  }
});

// Route to delete an order
router.post('/all-orders/delete/:orderId', async (req, res) => {
  const orderId = req.params.orderId;
  try {
    const deleteResponse = await productHelpers.deleteOrder(orderId);
    if (deleteResponse.success) {
     console.log( deleteResponse.message);
    } else {
      console.log(deleteResponse.error);
    }
  } catch (error) {
    console.log('error', 'Failed to delete the order.');
  } finally {
    res.redirect('/admin/all-orders');
  }
});

// Route to update the status of an order
router.post('/all-orders/update-status/:orderId', async (req, res) => {
  const orderId = req.params.orderId;
  const newStatus = req.body.status;
  try {
    const updateStatusResponse = await productHelpers.updateOrderStatus(orderId, newStatus);
    if (updateStatusResponse.success) {
      console.log(updateStatusResponse.message);
    } else {
      console.log(updateStatusResponse.error);
    }
  } catch (error) {
    console.log('error', 'Failed to update order status.');
  } finally {
    res.redirect('/admin/all-orders');
  }
});

// Route to display all orders in the admin panel
router.get('/all-users',isAdminAuthenticated, async (req, res) => {
  try {
    const usersResponse = await productHelpers.getAllUsers();
    if (usersResponse.success) {
      const users = usersResponse.data;
      res.render('admin/all-users', { users, admin: true, adminStatus: req.session.admin });
    } else {
      console.log(usersResponse.error);
      res.redirect('/admin');
    }
  } catch (error) {
    console.log('error', 'Failed to fetch orders.');
    res.redirect('/admin');
  }
});

router.post("/remove-from-user", async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await productHelpers.removeUser(userId);

    if (result.success) {
      // If the operation was successful, send a success response
      res.status(200).json({ success: true });
    } else {
      // If there was an error, send an error response
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    // Handle any unexpected errors
    console.error("Error removing user:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;


 
