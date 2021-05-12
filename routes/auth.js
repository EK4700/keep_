const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authCtrl");
const { check, body } = require("express-validator/check");
const User = require("../models/User");

router.get("/login", authCtrl.getLogin);
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter valid email address")
      .normalizeEmail(),
    body("password", "Incorrect Password Format")
      .isLength({ min: 5, max: 25 })
      .isAlphanumeric()
      .trim(),
  ],
  authCtrl.postLogin
);

router.get("/signup", authCtrl.getSignup);
router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please Provide correct email")
      .custom((value, { req }) => {
        // if (value === 'test@test.com') {
        //     throw new Error('You are banned from my website')
        // }
        // return true

        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("Email already Exists");
          }
        });
      })
      .normalizeEmail(),

    body(
      "password",
      "Please enter alphanumeric password only with at least 5 characters"
    )
      .isLength({ min: 5, max: 25 })
      .isAlphanumeric()
      .trim(),

    body("password2").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords Not Matching !");
      }
      return true;
    }),
  ],
  authCtrl.postSignup
);
router.post("/logout", authCtrl.postLogout);
router.get("/reset", authCtrl.getReset);
router.post("/reset", authCtrl.postReset);
router.get("/reset/:token", authCtrl.getNewPassword);
router.post("/new-password", authCtrl.postNewPassword);

module.exports = router;
