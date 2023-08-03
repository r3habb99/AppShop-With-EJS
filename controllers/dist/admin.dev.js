"use strict";

var Product = require("../models/product");

var fileHelper = require("../util/file");

var _require = require("express-validator"),
    validationResult = _require.validationResult;

exports.getAddProduct = function (req, res, next) {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = function (req, res, next) {
  var title = req.body.title;
  var image = req.file;
  var price = req.body.price;
  var description = req.body.description;
  var errors = validationResult(req);

  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: "Attached file is not an image",
      validationErrors: []
    });
  }

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        imageUrl: image,
        description: description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  var imageUrl = image.path;
  var product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  product.save().then(function (result) {
    res.redirect("/admin/products");
  })["catch"](function (err) {
    // return res.status(500).render("admin/edit-product", {
    //   pageTitle: "Add Product",
    //   path: "/admin/add-product",
    //   editing: false,
    //   hasError: true,
    //   product: {
    //     title: title,
    //     imageUrl: imageUrl,
    //     price: price,
    //     description: description,
    //   },
    //   errorMessage: "Database Operation Failed, Please try later",
    //   validationErrors,
    // });
    // res.redirect("/500");
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.getEditProduct = function (req, res, next) {
  var editMode = req.query.edit;

  if (!editMode) {
    return res.redirect("/");
  }

  var prodId = req.params.productId;
  Product.findById(prodId).then(function (product) {
    if (!product) {
      return res.redirect("/");
    }

    res.render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: editMode,
      product: product,
      hasError: false,
      errorMessage: null,
      validationErrors: []
    });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.postEditProduct = function (req, res, next) {
  var prodId = req.body.productId;
  var updatedTitle = req.body.title;
  var image = req.file;
  var updatedPrice = req.body.price;
  var updatedDesc = req.body.description;
  var errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  Product.findById(prodId).then(function (product) {
    if (product.userId.toString() !== req.user._id.toString()) {
      return res.redirect("/");
    }

    product.title = updatedTitle;
    product.price = updatedPrice;
    product.description = updatedDesc;

    if (image) {
      fileHelper.deleteFile(product.imageUrl);
      product.imageUrl = image.path;
    }

    return product.save().then(function (result) {
      //console.log("UPDATED PRODUCT!");
      res.redirect("/admin/products");
    });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.getProducts = function (req, res, next) {
  Product.find({
    userId: req.user._id
  }).then(function (products) {
    //console.log(products);
    res.render("admin/products", {
      prods: products,
      pageTitle: "Admin Products",
      path: "/admin/products"
    });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.deleteProduct = function (req, res, next) {
  var prodId = req.params.productId;
  Product.findById(prodId).then(function (product) {
    if (!product) {
      return next(new Error("Product not Found."));
    }

    fileHelper.deleteFile(product.imageUrl);
    return Product.deleteOne({
      _id: prodId,
      userId: req.user._id
    });
  }).then(function () {
    //console.log("DESTROYED PRODUCT");
    res.status(200).json({
      message: "Success!"
    });
  })["catch"](function (err) {
    res.status(500).json({
      message: "Deletion failed"
    });
  });
};