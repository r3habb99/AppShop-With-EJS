"use strict";

var crypto = require("crypto");

var bcrypt = require("bcryptjs");

var nodemailer = require("nodemailer");

var _require = require("express-validator"),
    validationResult = _require.validationResult;

var User = require("../models/user");

var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rishabh.prajapati@brainvire.com",
    pass: "zsmrqjzbitjqlykl"
  }
});

exports.getLogin = function (req, res, next) {
  var message = req.flash("error");

  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: ""
    },
    validationErrors: []
  });
};

exports.getSignup = function (req, res, next) {
  var message = req.flash("error");

  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
      confirmPassword: ""
    },
    validationErrors: []
  });
};

exports.postLogin = function (req, res, next) {
  var email = req.body.email;
  var password = req.body.password;
  var errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password
      },
      validationErrors: errors.array()
    });
  }

  User.findOne({
    email: email
  }).then(function (user) {
    if (!user) {
      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid Email or Password",
        oldInput: {
          email: email,
          password: password
        },
        validationErrors: []
      });
    }

    bcrypt.compare(password, user.password).then(function (doMatch) {
      if (doMatch) {
        req.session.isLoggedIn = true;
        req.session.user = user;
        return req.session.save(function (err) {
          console.log(err);
          res.redirect("/");
        });
      }

      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid Email or Password",
        oldInput: {
          email: email,
          password: password
        },
        validationErrors: []
      });
    })["catch"](function (err) {
      console.log(err);
      res.redirect("/login");
    });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500; //console.log(error);

    return next(error);
  });
};

exports.postSignup = function (req, res, next) {
  var email = req.body.email;
  var password = req.body.password;
  var errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword
      },
      validationErrors: errors.array()
    });
  }

  bcrypt.hash(password, 12).then(function (hashedPassword) {
    var user = new User({
      email: email,
      password: hashedPassword,
      cart: {
        items: []
      }
    });
    return user.save();
  }).then(function (result) {
    res.redirect("/"); // return transporter.sendMail({
    //   to: email,
    //   from: "rishabh.prajapati@brainvire.com",
    //   subject: "Congrats! Registration Done Successfully",
    //   html: `<h1>Welcome! ${email},</h1>
    //   <p> Thanks for choosing AppShop! We are happy to see you AppShop.</p>`,
    // });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.postLogout = function (req, res, next) {
  req.session.destroy(function (err) {
    console.log(err);
    res.redirect("/login");
  });
};

exports.getReset = function (req, res, next) {
  var message = req.flash("error");

  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message
  });
};

exports.postReset = function (req, res, next) {
  crypto.randomBytes(32, function (err, buffer) {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }

    var token = buffer.toString("hex");
    User.findOne({
      email: req.body.email
    }).then(function (user) {
      if (!user) {
        req.flash("error", "No account with that email found");
        res.redirect("/reset");
      }

      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000;
      return user.save();
    }).then(function (result) {
      res.redirect("/");
      transporter.sendMail({
        to: req.body.email,
        from: "reynold6@ethereal.email",
        subject: "Password Reset",
        html: "<p>You Requested a password reset</p>\n                <p>Click this <a href=\"http://localhost:3000/reset/".concat(token, "\">link</a> to set a new password</p>")
      });
    })["catch"](function (err) {
      var error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
  });
};

exports.getNewPassword = function (req, res, next) {
  var token = req.params.token;
  User.findOne({
    resetToken: token,
    resetTokenExpiration: {
      $gt: Date.now()
    }
  }).then(function (user) {
    var message = req.flash("error");

    if (message.length > 0) {
      message = message[0];
    } else {
      message = null;
    }

    res.render("auth/new-password", {
      path: "/new-password",
      pageTitle: "New Password",
      errorMessage: message,
      userId: user._id.toString(),
      passwordToken: token
    });
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.postNewPassword = function (req, res, next) {
  var newPassword = req.body.password;
  var userId = req.body.userId;
  var passwordToken = req.body.passwordToken;
  var resetUser;
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: {
      $gt: Date.now()
    },
    _id: userId
  }).then(function (user) {
    resetUser = user;
    return bcrypt.hash(newPassword, 12);
  }).then(function (hashedPassword) {
    resetUser.password = hashedPassword;
    resetUser.resetToken = undefined;
    resetUser.resetTokenExpiration = undefined;
    return resetUser.save();
  }).then(function (result) {
    res.redirect("/login");
  })["catch"](function (err) {
    var error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};