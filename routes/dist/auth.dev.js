"use strict";

var express = require("express");

var _require = require("express-validator"),
    check = _require.check,
    body = _require.body;

var authController = require("../controllers/auth");

var User = require("../models/user");

var router = express.Router();
router.get("/login", authController.getLogin);
router.get("/signup", authController.getSignup);
router.post("/login", [body("email").isEmail().withMessage("Please enter valid email address").normalizeEmail(), body("password", "Please enter correct password").isLength({
  min: 4
}).trim()], authController.postLogin);
router.post("/signup", [check("email").isEmail().withMessage("Please enter valid email").custom(function (value, _ref) {
  var req = _ref.req;
  return User.findOne({
    email: value
  }).then(function (userDoc) {
    if (userDoc) {
      return Promise.reject("Email already taken, try another email id");
    }
  });
}).normalizeEmail(), body("password", "Please enter correct password with at least 4 characters").isLength({
  min: 4
}).trim(), body("confirmPassword").trim().custom(function (value, _ref2) {
  var req = _ref2.req;

  if (value !== req.body.password) {
    throw new Error("Password have to match!");
  }

  return true;
})], authController.postSignup);
router.post("/logout", authController.postLogout);
router.get("/reset", authController.getReset);
router.post("/reset", authController.postReset);
router.get("/reset/:token", authController.getNewPassword);
router.post("/new-password", authController.postNewPassword);
module.exports = router;