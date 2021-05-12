const express = require("express");
const path = require("path");
const isAuth = require("../middleware/isAuth");
const router = express.Router();
const productCtrl = require("../controllers/productCtrl");

router.get("/", productCtrl.getProducts);
router.get("/products/:id", productCtrl.getProduct);
router.get("/add-product",isAuth, productCtrl.getAddProduct);
router.post("/add-product",isAuth, productCtrl.postAddProduct);
router.get('/cart', isAuth, productCtrl.getCart);
router.post('/cart', isAuth, productCtrl.postCart);
router.post('/cart-delete', isAuth, productCtrl.postDeleteCart);
router.get('/orders', isAuth, productCtrl.getOrder);
router.post('/orders', isAuth, productCtrl.postOrder);
router.get('/orders/:orderId', isAuth, productCtrl.getInvoice);
router.get('/checkout', isAuth, productCtrl.getCheckout)

module.exports = router;
