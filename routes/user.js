var express = require("express");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
var userHelpers = require("../helpers/user-helpers");
var { Order, Product } = require("../config/mongoose-schema");

const Razorpay = require("razorpay");

// Initialize Razorpay with your API key and secret
const razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

var verifyLogin = (req, res, next) => {
  if (req.session.userloggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* GET home page. */
router.get("/", async function (req, res, next) {
  try {
    const user = req.session.user;
    let cartCount = null;
    if (user) {
      cartCount = await userHelpers.getCartCount(user._id);
    }

    // Now, you have the cart count, and you can use it as needed
    console.log("Cart count:", cartCount);

    console.log("userfrom session", user);
    const products = await productHelpers.getAllProducts();

    function transformProductsForTemplate(products) {
      return products.map((product, index) => ({
        index: index + 1,
        name: product.name,
        category: product.category,
        price: product.price,
        description: product.description,
        id: product._id.toString(),
      }));
    }

    const transformedProducts = transformProductsForTemplate(products);

    // Render the Handlebars template with the transformed data
    res.render("users/view-products", {
      admin: false,
      products: transformedProducts,
      user,
      cartCount,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/login", (req, res, next) => {
  const user = req.session.user;
  console.log("user above home", user);
  if (user) {
    console.log("user in home", user);
    res.redirect("/");
  } else {
    console.log("no user");
    next(); // Proceed to render the login page if the user is not logged in
  }
});

router.get("/login", (req, res) => {
  res.render("users/login", { loginErr: req.session.userloginErr });
  req.session.userloginErr = false;
});

router.get("/signup", (req, res) => {
  res.render("users/signup");
});
router.post("/signup", async (req, res) => {
  try {
    const newUser = await userHelpers.registerUser(req);
    console.log("newuser", newUser);
    if (newUser) {
      
   
      res.redirect("/");
    } else {
      res.redirect("/signup");
    }
  } catch (err) {
    console.log("error in newuser", err);
  }
});
router.post("/login", async (req, res) => {
  try {
    const userData = await userHelpers.loginUser(req); // Pass the request object to the loginUser function

    if (userData.token) {
     
      req.session.user = userData.user; // Set the user data in the session
      req.session.userloggedIn = true;
      // Redirect to the root path ("/") on successful login

      res.redirect("/");
    } else {
      // Redirect to the login page ("/login") on failed login
      req.session.userloginErr = true;
      res.redirect("/login");
    }
  } catch (err) {
    console.log("error in token", err);
  }
});

router.get("/logout", (req, res) => {
  req.session.user= null;
  req.session.userloggedIn=false;
  res.redirect("/");
});

router.get("/cart", verifyLogin, async (req, res) => {
  try {
    // Handle the case where the cart is not defined or empty

    // Set the user's cart data in the session (if not already set)
    const user = req.session.user;
    const userCartData = await userHelpers.getUserCartData(user._id);
    const cartAmount = await userHelpers.getTotalCartAmount(user._id);
    console.log("cart amount", cartAmount);
    req.session.cart = userCartData;
    if (userCartData) {
      console.log("from getusercarddata", userCartData.products);
      const productDetailsInCart = await userHelpers.getProductDetailsFromCart(
        userCartData.products
      );
      console.log("prodetails in cart", productDetailsInCart);
      function transformProductsForTemplate(products) {
        return products.map((product, index) => ({
          index: index + 1,
          name: product.name,
          price: product.price,
          quantity: product.quantity,
          id: product._id.toString(),
        }));
      }

      const transformedProducts =
        transformProductsForTemplate(productDetailsInCart);

      res.render("users/cart", {
        products: transformedProducts,
        user,
        cartAmount,
      });
    } else {
      res.render("users/cart", { products: [], user });
    }
  } catch (error) {
    console.error("Error retrieving cart:", error);
    res.render("error");
  }
});

router.get("/add-to-cart/:productId",verifyLogin, async (req, res) => {
  const productId = req.params.productId;
  const userId = req.session.user._id; // Assuming you have user authentication
  console.log("id in addtocart", userId);
  try {
    let updatedCart = await userHelpers.addToCart(userId, productId);
    const cartCount = await userHelpers.getCartCount(userId);

    // Update the session's cart with the updated cart
    req.session.cart = updatedCart;

    console.log(updatedCart);
    res.json({ status: true, cartCount }); // Redirect to the cart page or respond as needed
  } catch (error) {
    console.log("error in router", error);
    res.redirect("/"); // Redirect to an error page or handle the error as needed
  }
});

// Route to change the quantity of a product in the cart
router.post("/change-cart-item-quantity", async (req, res) => {
  try {
    const { productId, quantityChange } = req.body;
    const userId = req.session.user._id;

    // Call the helper function to change the cart item quantity
    const result = await userHelpers.changeCartItemQuantity(
      userId,
      productId,
      quantityChange
    );
    console.log("qty to script", result.quantity);
    const cartAmount = await userHelpers.getTotalCartAmount(userId);

    if (result.success) {
      // If the operation was successful, send the updated quantity as a response
      res
        .status(200)
        .json({ success: true, quantity: result.quantity, total: cartAmount });
    } else {
      // If there was an error, send an error response
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    // Handle any unexpected errors
    console.error("Error changing cart item quantity:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/remove-from-cart", async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user._id;

    // Call a function to remove the specified product from the user's cart
    const result = await userHelpers.removeProductFromCart(userId, productId);

    if (result.success) {
      // If the operation was successful, send a success response
      res.status(200).json({ success: true });
    } else {
      // If there was an error, send an error response
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    // Handle any unexpected errors
    console.error("Error removing product from cart:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/place-order", verifyLogin, async (req, res) => {
  const user = req.session.user;
  const products = await productHelpers.getAllProducts();
  const cartAmount = await userHelpers.getTotalCartAmount(user._id);
  const cartCount = await userHelpers.getCartCount(user._id);

  function transformProductsForTemplate(products) {
    return products.map((product, index) => ({
      index: index + 1,
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description,
      id: product._id.toString(),
    }));
  }

  const transformedProducts = transformProductsForTemplate(products);

  res.render("users/place-order", {
    user,
    products: transformedProducts,
    cartAmount,
    cartCount,
  });
});

// Define a route to place an order
router.post("/place-order", async (req, res) => {
  try {
    const { userId, address, pin, phone, paymentMethod } = req.body;

    // Call the placeOrder function to create the order
    const result = await userHelpers.placeOrder(
      userId,
      address,
      pin,
      phone,
      paymentMethod
    );

    if (paymentMethod === "cashOnDelivery") {
      // Respond with a success message or order ID for cash on delivery
      res.status(200).json(result);
    } else if (paymentMethod === "razorpay") {
      // Generate a Razorpay order
      const amountInPaise = Math.round(result.totalAmount * 100);
      const razorpayOrder = await userHelpers.generateRazorPay(
        result._id.toString(), // Convert the order ID to a string if it's not already
        amountInPaise
        // Convert totalAmount to paise
      );
      console.log("razorpayorder in route", razorpayOrder);
      // Respond with the Razorpay order information
      res.status(200).json({ razorpayOrder});
    } else {
      // Handle other payment methods here
      res.status(400).json({ error: "Invalid payment method" });
    }
  } catch (error) {
    // Handle any errors that may occur during order placement
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/order-summary", verifyLogin, async (req, res) => {
  try {
    // Retrieve the order details from your database
    const userId = req.session.user._id;
    // Find orders associated with the user ID
    const orders = await Order.find({ userId });

    console.log("order in summary", orders[orders.length - 1]);
    // Render the order success page with order details
    function transformOrderForTemplate(order) {
      const inputDate = new Date(order.date);

      // Define options for formatting the date
      const options = { year: "numeric", month: "long", day: "numeric" };

      return {
        date: inputDate.toLocaleDateString(undefined, options),
        address: order.address,
        price: order.totalAmount,
        phone: order.phone,
        id: order._id.toString(),
      };
    }

    const transformedProducts = transformOrderForTemplate(
      orders[orders.length - 1]
    );
    console.log("order transformed", transformedProducts);
    res.render("users/order-summary", {
      order: transformedProducts,
      user: req.session.user,
    }); // Pass the order data to the template
  } catch (error) {
    // Handle any errors
    console.error("Error retrieving order details:", error);
    res.status(500).send("Internal server error");
  }
});

// Define a route to display the user's order list
router.get("/order-list", verifyLogin, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const cartCount = await userHelpers.getCartCount(userId);
    const orders = await Order.find({ userId }).sort({ date: -1 });
    function transformOrdersForTemplate(orders) {
      // Define options for formatting the date
      const options = { year: "numeric", month: "long", day: "numeric" };

      return orders.map((order) => ({
        date: new Date(order.date).toLocaleDateString(undefined, options),
        address: order.address,
        price: order.totalAmount,
        phone: order.phone,
        status: order.status,
        pin: order.pin,
        payment: order.paymentMethod,
        id: order._id.toString(),
      }));
    }

    const transformedOrders = transformOrdersForTemplate(orders);

    res.render("users/order-list", {
      orders: transformedOrders,
      user: req.session.user,
      cartCount,
    });
  } catch (error) {
    console.error("Error retrieving user orders:", error);
    res.status(500).send("Internal server error");
  }
});

// Define a route to display order details
router.get("/order-details/:orderId", verifyLogin, async (req, res) => {
  try {
    // Retrieve the order details by orderId
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    const cartCount = await userHelpers.getCartCount(req.session.user._id);

    if (!order) {
      // Handle the case where the order doesn't exist
      return res.status(404).send("Order not found");
    }

    // Retrieve product details for the order
    const productDetails = await Promise.all(
      order.orderDetails.map(async (item) => {
        const product = await Product.findById(item.productId);
        return {
          product,
          quantity: item.quantity, // Include quantity from orderDetails
        };
      })
    );
    // Render the order success page with order details
    function transformOrderForTemplate(order) {
      const inputDate = new Date(order.date);

      // Define options for formatting the date
      const options = { year: "numeric", month: "long", day: "numeric" };

      return {
        date: inputDate.toLocaleDateString(undefined, options),
        address: order.address,
        price: order.totalAmount,
        phone: order.phone,
        pin: order.pin,
        id: order._id.toString(),
      };
    }

    const transformedOrder = transformOrderForTemplate(order);

    console.log("orderdetails in product details", productDetails);
    function transformProductsForTemplate(products) {
      return products.map((productDetail, index) => {
        const product = productDetail.product; // Access the nested product object
        return {
          index: index + 1,
          name: product.name,
          category: product.category,
          price: product.price,
          description: product.description,
          id: product._id.toString(),
          quantity: productDetail.quantity, // Include quantity from orderDetails
        };
      });
    }

    const transformedProducts = transformProductsForTemplate(productDetails);
    console.log("transformed order details", transformedProducts);
    console.log("order in product details", transformedOrder);

    // Render the order-details view with order and product details
    res.render("users/order-details", {
      order: transformedOrder,
      orderDetails: transformedProducts,
      user: req.session.user,
      cartCount,
    });
  } catch (error) {
    // Handle any errors
    console.error("Error retrieving order details:", error);
    res.status(500).send("Internal server error");
  }
});


// Define the route to verify the Razorpay payment
router.post("/verifypayment", async (req, res) => {
  try {
    const { order_id, payment_id } = req.body;
    console.log("payment verification", req.body);
    // Verify the payment with Razorpay
    const payment = await razorpay.payments.fetch(payment_id);
    console.log("payment status", payment);

    if (payment.status === "captured") {
      console.log("orderid",order_id);
      // Payment was successful, update the order status to "placed"
      const orderId = order_id; // You may need to adjust how you get the order ID
      const updated = await userHelpers.updateOrderStatus(orderId, "placed");

      if (updated) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to update order status" });
      }
    } else {
      // Payment failed or is pending
      res.status(400).json({ success: false });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
