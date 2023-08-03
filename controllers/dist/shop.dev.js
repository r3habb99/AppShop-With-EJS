"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var fs = require("fs");

var path = require("path");

var PDFDocument = require("pdfkit"); // const stripe = require("stripe")(
//   "sk_test_51NXcZSSFX6YlYAYxhJhPX2M1UH0nPkcUzUkRxwXT6UQVs7PrAgpSVxyRS6xUQoZq8Gkh1ooaYx8lv7LBmnIZcmZQ00aTnpbHgH"
// ); //private key only for backend


var Product = require("../models/product");

var Order = require("../models/order");

var ITEMS_PER_PAGE = 3;

exports.getProducts = function (req, res, next) {
  var page = +req.query.page || 1;
  var totalItems;
  Product.find().countDocuments().then(function (numProducts) {
    totalItems = numProducts;
    return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
  }).then(function (products) {
    res.render("shop/product-list", {
      prods: products,
      pageTitle: "All Products",
      path: "/products",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
    });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.getProduct = function (req, res, next) {
  var prodId = req.params.productId;
  Product.findById(prodId).then(function (product) {
    res.render("shop/product-detail", {
      product: product,
      pageTitle: product.title,
      path: "/products"
    });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.getIndex = function (req, res, next) {
  var page = +req.query.page || 1;
  var totalItems;
  Product.find().countDocuments().then(function (numProducts) {
    totalItems = numProducts;
    return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
  }).then(function (products) {
    res.render("shop/index", {
      prods: products,
      pageTitle: "Home",
      path: "/",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
    });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.getCart = function (req, res, next) {
  req.user.populate("cart.items.productId").then(function (user) {
    var products = user.cart.items;
    res.render("shop/cart", {
      path: "/cart",
      pageTitle: "Your Cart",
      products: products
    });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.postCart = function (req, res, next) {
  var prodId = req.body.productId;
  Product.findById(prodId).then(function (product) {
    return req.user.addToCart(product);
  }).then(function (result) {
    res.redirect("/products");
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.postCartDeleteProduct = function (req, res, next) {
  var prodId = req.body.productId;
  req.user.removeFromCart(prodId).then(function (result) {
    res.redirect("/cart");
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.getCheckout = function (req, res, next) {
  var products;
  var total = 0;
  req.user.populate("cart.items.productId").then(function (user) {
    products = user.cart.items;
    total = 0;
    products.forEach(function (p) {
      total += p.quantity * p.productId.price;
    });
    res.render("shop/checkout", {
      path: "/checkout",
      pageTitle: "Checkout",
      products: products,
      totalPrice: total
    });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.postOrder = function (req, res, next) {
  req.user.populate("cart.items.productId").then(function (user) {
    var products = user.cart.items.map(function (i) {
      return {
        quantity: i.quantity,
        product: _objectSpread({}, i.productId._doc),
        totalPrice: i.quantity * i.productId.price
      };
    }); // Calculate the total price for the entire order

    var totalPrice = products.reduce(function (acc, product) {
      return acc + product.totalPrice;
    }, 0);
    var order = new Order({
      user: {
        email: req.user.email,
        userId: req.user
      },
      products: products,
      totalPrice: totalPrice
    });
    return order.save();
  }).then(function (result) {
    return req.user.clearCart();
  }).then(function () {
    //console.log("CART PRODUCT ORDER");
    res.redirect("/orders");
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.getOrders = function (req, res, next) {
  Order.find({
    "user.userId": req.user._id
  }).then(function (orders) {
    res.render("shop/orders", {
      path: "/orders",
      pageTitle: "Your Orders",
      orders: orders
    });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.getInvoice = function (req, res, next) {
  var orderId = req.params.orderId;
  Order.findById(orderId).then(function (order) {
    if (!order) {
      return next(new Error("No order found."));
    }

    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error("Unauthorized"));
    }

    var invoiceName = "invoice-" + orderId + ".pdf";
    var invoicePath = path.join("data", "invoices", invoiceName);
    var pdfDoc = new PDFDocument({
      size: "A4"
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="' + invoiceName + '"');
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);
    pdfDoc.font("Times-Roman").fillColor("#00695c").fontSize(30).text("Order Invoice", {
      align: "center"
    });
    pdfDoc.text("______________________________", {
      align: "center"
    });
    order.products.forEach(function (prod) {
      pdfDoc.fillColor("black").fontSize(20).text("Name:- ".concat(prod.product.title, ","), {
        align: "center"
      }).text("Qauntity:- ".concat(prod.quantity, "  *  $ ").concat(prod.product.price, "/-"), {
        align: "center"
      });
      pdfDoc.fillColor("#00695c").fontSize(30).text("______________________________", {
        align: "center"
      });
    });
    pdfDoc.text("Total Price = $ ".concat(order.totalPrice, "/-"), {
      align: "center"
    });
    pdfDoc.end(); // fs.readFile(invoicePath, (err, data) => {
    //   if (err) {
    //     return next(err);
    //   }
    //   res.setHeader("Content-Type", "application/pdf");
    //   res.setHeader(
    //     "Content-Disposition",
    //     'inline; filename="' + invoiceName + '"'
    //   );
    //   res.send(data);
    // });
    // const file = fs.createReadStream(invoicePath);
    // file.pipe(res);
  })["catch"](function (err) {
    return next(err);
  });
};