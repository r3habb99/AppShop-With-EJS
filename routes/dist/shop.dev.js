"use strict";

var path = require("path");

var express = require("express");

var shopController = require("../controllers/shop");

var isAuth = require("../middleware/is-auth");

var router = express.Router();
router.get("/", shopController.getIndex);
router.get("/products", shopController.getProducts);
router.get("/products/:productId", shopController.getProduct);
router.get("/cart", isAuth, shopController.getCart);
router.post("/cart", isAuth, shopController.postCart);
router.post("/cart-delete-item", isAuth, shopController.postCartDeleteProduct);
router.post("/create-order", isAuth, shopController.postOrder);
router.get("/checkout", isAuth, shopController.getCheckout);
router.get("/orders", isAuth, shopController.getOrders);
router.get("/orders/:orderId", isAuth, shopController.getInvoice);
module.exports = router;