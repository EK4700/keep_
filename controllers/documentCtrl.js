const Document = require("../models/Document");
const { validationResult } = require("express-validator/check");
const path = require("path");

exports.getDocuments = (req, res, next) => {
  Document.find({userId: req.user._id})
    .then((documents) => {
      res.render("document/index", {
        docTitle: "Home Page",
        documents,
        hasProducts: documents.length > 0,
        productsActive: true,
      });
    })
    .catch((err) => console.log(err));
};

exports.getDocument = (req, res, next) => {
  const id = req.params.id;
  Document.findById(id)
    .then((document) => {
      res.render("document/document-details", {
        document,
        docTitle: "Keep",
      });
    })
    .catch((err) => console.log(err));
};

exports.getAddDocument = (req, res, next) => {
  res.render("document/add-document", {
    docTitle: "Add Product",
    addProductActive: true,
    editMode: false,
    errorMessage: null,
    document: {
      title: "",
      price: null,
      desc: "",
      imageUrl: "",
    },
  });
};

exports.postAddDocument = (req, res, next) => {
  const title = req.body.title;
  const content = req.body.desc;
  console.log(title, content, "req.body");
  let image = req.file;
  //no Image provided
  if (!image) {
    image = { path: "images/no-image.png" };
  }
  if(image.mimetype === 'application/pdf'){
    image = { path: "images/pdf.png"}
  }
  const imageUrl = image.path;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.render("document/add-document", {
      docTitle: "Add Document",
      addProductActive: true,
      editMode: false,
      errorMessage: errors.array()[0].msg,
      product: { title, price, desc },
    });
  }
  let document = new Document({
    title,
    content,
    imageUrl,
    userId: req.user._id,
  });
  document
    .save()
    .then(() => {
      res.redirect("/document");
    })
    .catch((err) => console.log(err));
};

