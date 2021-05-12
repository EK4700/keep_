const Product = require("../models/Product");
const Order = require("../models/Order");
const Document = require("../models/Document");
require("dotenv").config();
const { validationResult } = require("express-validator/check");
const path = require("path");
const fs = require("fs");
const pdfDocument = require("pdfkit");
const stripe = require("stripe")(process.env.stripe_key);
const stripe_p = process.env.stripe_key_p;

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

exports.getProducts = (req, res, next) => {
  let noMatch = null;
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), "gi");
    // Get all products from DB
    let products = null;
    Product.find({ title: regex }, async function (err, allProducts) {
      if (err) {
        console.log(err);
      } else {
        if (allProducts.length < 1) {
          await Product.find({ desc: regex }, function (error, newAllProducts) {
            if (error) {
              console.log(err, "desc search error");
            } else {
              allProducts = [...newAllProducts];
            }
          });
          noMatch = "No campgrounds match that query, please try again.";
        }
        products = [...allProducts];
      }
      res.render("products/index", {
        docTitle: "Home Page",
        products: products,
        hasProducts: products.length > 0,
        productsActive: true,
        noMatch: noMatch,
      });
    });
  } else {
    Product.find()
      .then((products) => {
        res.render("products/index", {
          docTitle: "Home Page",
          products,
          hasProducts: products.length > 0,
          productsActive: true,
        });
      })
      .catch((err) => console.log(err));
  }
};

exports.getProduct = (req, res, next) => {
  const id = req.params.id;
  Product.findById(id)
    .then((product) => {
      res.render("products/product-details", {
        product,
        docTitle: "Keep",
      });
    })
    .catch((err) => console.log(err));
};

exports.getAddProduct = (req, res, next) => {
  res.render("products/add-product", {
    docTitle: "Add Product",
    addProductActive: true,
    editMode: false,
    errorMessage: null,
    product: {
      title: "",
      price: null,
      desc: "",
      imageUrl: "",
    },
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const price = req.body.price;
  const desc = req.body.desc;
  let image = req.file;
  //no Image provided
  if (!image) {
    image = { path: "images/no-image.png" };
  }
  const imageUrl = image.path;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.render("products/add-product", {
      docTitle: "Add Product",
      addProductActive: true,
      editMode: false,
      errorMessage: errors.array()[0].msg,
      product: { title, price, desc },
    });
  }
  let product = new Product({
    title,
    price,
    desc,
    imageUrl,
    userId: req.user._id,
  });
  product
    .save()
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => console.log(err));
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.products.productId")
    .execPopulate()
    .then((user) => {
      //console.log(user.cart.products);
      res.render("products/cart", {
        docTitle: "Cart Page",
        activeCart: true,
        products: user.cart.products,
        hasProducts: user.cart.products.length > 0,
      });
    });
};

exports.postCart = (req, res, next) => {
  let id = req.body.id;
  Product.findById(id)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then(() => {
      res.redirect(req.body.path);
    });
};

exports.postDeleteCart = (req, res, next) => {
  const id = req.body.id;
  const path = req.body.path;
  req.user
    .removeFromCart(id)
    .then((result) => {
      res.redirect(path);
    })
    .catch((err) => console.log(err));
};

exports.getOrder = (req, res, next) => {
  Order.find({ "user.userId": req.user._id }).then((orders) => {
    res.render("products/orders", {
      activeOrders: true,
      docTitle: "My Orders",
      orders: orders,
    });
  });
};

exports.postOrder = (req, res, next) => {
  const token = req.body.stripeToken;

  let total;
  req.user
    .populate("cart.products.productId")
    .execPopulate()
    .then((user) => {
      total = user.cart.products.reduce(
        (acc, p) => (acc += p.qty * p.productId.price),
        0
      );
      // Use Map array Manipulation
      const products = user.cart.products.map((p) => {
        return {
          qty: p.qty,
          product: { ...p.productId._doc },
        };
      });

      //create an order
      const order = new Order({
        user: { email: req.user.email, userId: req.user },
        products: products,
      });
      user.cart.products.map(p => {
        new Document({
          title: p.productId.title,
          content: p.productId.desc,
          imageUrl: p.productId.imageUrl,
          userId: p.productId.userId
        }).save()
      })
      return order.save();
    })
    .then((result) => {
      // charge the user
      const charge = stripe.charges
        .create({
          amount: total * 100,
          currency: "usd",
          description: "Test charge ",
          source: token,
          metadata: { order_id: result._id.toString() },
        })
        .then((data) => {
          data;
        })
        .catch((e) => console.log(e, "charge error"));

      return req.user.clearCart();
    })
    .then((result) => {
      res.redirect("/orders");
    })
    .catch((e) => console.log(e));
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate("cart.products.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.products;

      let total = products.reduce(
        (acc, p) => (acc += p.qty * p.productId.price),
        0
      );
      res.render("products/checkout", {
        docTitle: "Checkout",
        products: products,
        s_key: stripe_p,
        total: total,
        stripeAmount: total * 100,
      });
    });
};

exports.getInvoice = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new Error("No order found"));
    }

    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error("UnAuthorized"));
    }

    // server the invoice to the user
    const invoiceName = "invoice-" + orderId + ".pdf";
    const invoicePath = path.join("data", "invoices", invoiceName);

    const pdfDoc = new pdfDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline;filename="invoice.pdf"');

    pdfDoc.pipe(fs.createWriteStream(invoicePath));

    pdfDoc
      .font("Times-Bold")
      .fontSize(26)
      .fillColor("blue")
      .text("Order Invoice", { align: "center", underline: true });
    pdfDoc.font("Times-Roman").fontSize(12).fillColor("black");

    pdfDoc.moveDown();
    let total = 0;
    order.products.forEach((prod) => {
      total += prod.qty * prod.product.price;
      pdfDoc.text("• " + prod.product.title, { continued: true });
      pdfDoc.text(
        `${prod.qty} x ${prod.product.price.toFixed(2)} = ${
          prod.qty * prod.product.price.toFixed(2)
        }`,
        { align: "right" }
      );
    });

    pdfDoc.moveDown();
    pdfDoc
      .font("Times-Bold")
      .fontSize(13)
      .text("Total Price : $" + total, { align: "right" });
    pdfDoc.end();
    pdfDoc.pipe(res);
  } catch (e) {
    console.log(e.message);
  }
};
