"use strict";

var path = require("path");

var express = require("express");

var bodyParser = require("body-parser");

var mongoose = require("mongoose");

var session = require("express-session");

var MongoDBStore = require("connect-mongodb-session")(session); // const { csrfSync } = require("csrf-sync");


var flash = require("connect-flash");

var multer = require("multer");

var errorController = require("./controllers/error");

var User = require("./models/user");

var MONGODB_URI = "mongodb://localhost:27017/shopss"; // const { csrfSynchronisedProtection } = csrfSync({
//   getTokenFromRequest: (req) => req.body["CSRFToken"],
// });

var app = express();
var store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions"
});
var fileStorage = multer.diskStorage({
  destination: function destination(req, file, cb) {
    cb(null, "images");
  },
  filename: function filename(req, file, cb) {
    cb(null, new Date().toISOString() + "-" + file.originalname);
  }
});

var fileFilter = function fileFilter(req, file, cb) {
  if (file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set("view engine", "ejs");
app.set("views", "views");

var adminRoutes = require("./routes/admin");

var shopRoutes = require("./routes/shop");

var authRoutes = require("./routes/auth");

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(multer({
  storage: fileStorage,
  fileFilter: fileFilter
}).single("image"));
app.use(express["static"](path.join(__dirname, "public")));
app.use("/images", express["static"](path.join(__dirname, "images")));
app.use(session({
  secret: "my secret",
  resave: false,
  saveUninitialized: false,
  store: store
}));
app.use(function (req, res, next) {
  if (!req.session.user) {
    return next();
  }

  User.findById(req.session.user._id).then(function (user) {
    if (!user) {
      return next();
    }

    req.user = user;
    next();
  })["catch"](function (err) {
    next(new Error(err));
  });
}); // app.use(csrfSynchronisedProtection);

app.use(flash());
app.use(function (req, res, next) {
  res.locals.isAuthenticated = req.session.isLoggedIn; // res.locals.csrfToken = req.csrfToken(true);

  next();
});
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.use("/500", errorController.get500);
app.use(errorController.get404);
app.use(function (error, req, res, next) {
  // res.redirect("/500");
  res.status(500).render("500", {
    pageTitle: "Error",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn
  });
});
mongoose.connect(MONGODB_URI).then(function (result) {
  app.listen(9000);
})["catch"](function (err) {
  console.log(err);
});