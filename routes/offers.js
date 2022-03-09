const express = require("express");
const formidableMiddleware = require("express-formidable");
const app = express();
app.use(formidableMiddleware());
require("dotenv").config();

const router = express.Router();
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

//import des modèles
const Offer = require("../models/Offer");
const User = require("../models/User");

//import du MiddleWare
const isAuthenticated = require("../middleware/isAuthenticated");

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  console.log("user =>", req.user);
  try {
    const newOffer = new Offer({
      product_name: req.fields.product_name,
      product_description: req.fields.product_description,
      product_price: req.fields.product_price,
      product_details: [
        { MARQUE: req.fields.brand },
        { TAILLE: req.fields.size },
        { ETAT: req.fields.condition },
        { COULEUR: req.fields.color },
        { EMPLACEMENT: req.fields.city },
      ],
    });

    console.log("nouvelle offre =>", newOffer);
    //j'envoie mon image sur cloudinary
    let pictureToUpload = req.files.product_image.path;
    console.log("Image ajoutée =>", pictureToUpload);
    const result = await cloudinary.uploader.upload(pictureToUpload);
    console.log("result ==>", result);

    console.log(req.files);

    newOffer.product_image = result;

    //Je rajoute mon utilisateur
    newOffer.owner = req.user;

    await newOffer.save();
    res.json(newOffer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Route pour afficher et filter les annonces
router.get("/offers", async (req, res) => {
  // Mon objet filtersObject viendra récupérer les différents filtres
  const filtersObject = {};

  // Gestion du filtre pour filtrer par nom du produit
  if (req.query.product_name) {
    filtersObject.product_name = new RegExp(req.query.product_name, "i");
  }

  // Gestion du filtre pour filtrer les résultats par prix mininum et maximum
  if (req.query.priceMin) {
    filtersObject.product_price = {
      $gte: req.query.priceMin,
    };
  }

  //Si j'ai déjà une clé product_price dans mon objet objectFilters
  //il faut que j'ajoute dans cette clé
  if (req.query.priceMax) {
    if (req.query.priceMax) {
      filtersObject.product_price.$lte = req.query.priceMax;
    } else {
      filtersObject.product_price = {
        $lte: req.query.priceMax,
      };
    }
  }

  // Gestion du filtre pour classer les résultats par prix croissant ou décroissant
  //Création d'un objet pour effectuer le tri
  const sortObject = {};

  if (req.query.sort === "price-desc") {
    sortObject.product_price = "desc";
  } else if (req.query.sort === "price-asc") {
    sortObject.product_price = "asc";
  }

  // Gestion de la pagination

  //On a pas défaut 5 annonces par pages
  //Si ma page est égale à 1 je devrais skip 0 annonces
  //Si ma page est égale à 2 je devrais skip 5 annonces
  //Si ma page est égale à 4 je devrais skip 15 annonces

  //(1-1) * 5 = skip 0 résultat => PAGE 1
  //(2-1) * 5 = SKIP 5 RÉSULTAT => page 2
  //(4-1) * 5 = skip 15 résultats => page 4
  let limit = 3;
  if (req.query.limit) {
    limit = req.query.limit;
  }

  let page = 1;
  if (req.query.page) {
    page = req.query.page;
  }

  // Chaînage des méthodes de filtre
  const offers = await Offer.find(filtersObject)
    .sort(sortObject)
    .skip((page - 1) * limit)
    .limit(limit)
    .select("product_name product_price");

  const count = await Offer.countDocuments(filtersObject);

  res.json({ count: count, offers: offers });
});

//Route pour afficher une annonce
router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account.username account.phone",
    });
    res.json(offer);
  } catch (error) {
    res.status(400).json(error.message);
  }
});

module.exports = router;
