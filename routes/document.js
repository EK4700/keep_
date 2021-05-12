const express = require("express");
const path = require("path");
const isAuth = require("../middleware/isAuth");
const router = express.Router();
const documentCtrl = require("../controllers/documentCtrl");

router.get("/", isAuth, documentCtrl.getDocuments);
router.get("/document/:id", isAuth, documentCtrl.getDocument);
router.get("/add-document",isAuth, documentCtrl.getAddDocument);
router.post("/add-document",isAuth, documentCtrl.postAddDocument);

module.exports = router;
