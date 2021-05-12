const express = require("express");
const app = express();
const path = require("path");
require('dotenv').config();
const expressHbs = require("express-handlebars");
const mongoose = require("mongoose");
const session = require("express-session");
const User = require("./models/User");
const MongoDbStore = require("connect-mongodb-session")(session);
const productRoutes = require("./routes/products");
const documentRoutes = require("./routes/document");
const authRoutes = require("./routes/auth");
const flash = require("connect-flash");
const multer = require("multer");
const PORT = process.env.PORT || 8080;
const dbUrl = process.env.MONGO_DB_URL

//Session Management
const store = new MongoDbStore({
  uri: dbUrl,
  collection: "sessions",
});

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
//Setting static folder
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use(express.urlencoded({ extended: false }));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

//Flash messages management
app.use(flash());

//Session user check

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch((err) => console.log(err));
});

// configure Handlebars
app.engine(
  "hbs",
  expressHbs({
    extname: ".hbs",
    defaultLayout: "main-layouts",
    layoutsDir: "views/layouts",
    partialsDir: "views/partials",
    runtimeOptions: {
      allowProtoMethodsByDefault: true,
      allowProtoPropertiesByDefault: true,
    },
  })
);

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  next();
});

// Select hanldebars as view engine
app.set("view engine", "hbs");

//Routes
app.use("/document", documentRoutes);
app.use("/", productRoutes);
app.use(authRoutes);

//Db Connection and port listening
mongoose
  .connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to DB");
    app.listen(PORT);
  })
  .catch((err) => {
    throw new Error(err);
  });
