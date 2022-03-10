const express = require("express");
const formidableMiddleware = require("express-formidable");
const app = express();
app.use(formidableMiddleware());
require("dotenv").config();

const router = express.Router();
const cloudinary = require("cloudinary").v2;

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
    const result = await cloudinary.uploader.upload(pictureToUpload, {
      folder: `api/vinted/offers/${newOffer._id}`,
      public_id: "preview",
      cloud_name: "lereacteur",
    });
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

//Route pour supprimer une offre
router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    //Je supprime ce qui il y a dans le dossier
    await cloudinary.api.delete_resources_by_prefix(
      `api/vinted/offers/${req.params.id}`
    );
    //Une fois le dossier vide, je peux le supprimer !
    await cloudinary.api.delete_folder(`api/vinted/offers/${req.params.id}`);

    offerToDelete = await Offer.findById(req.params.id);

    await offerToDelete.delete();

    res.status(200).json("Offer deleted succesfully !");
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: error.message });
  }
});

//Route pour modifier une offre
router.put("/offer/update/:id", isAuthenticated, async (req, res) => {
  const offerToModify = await Offer.findById(req.params.id);
  try {
    if (req.fields.product_name) {
      offerToModify.product_name = req.fields.product_name;
    }
    if (req.fields.product_description) {
      offerToModify.product_description = req.fields.product_description;
    }
    if (req.fields.product_price) {
      offerToModify.product_price = req.fields.product_price;
    }

    const details = offerToModify.product_details;
    for (i = 0; i < details.length; i++) {
      if (details[i].MARQUE) {
        if (req.fields.brand) {
          details[i].MARQUE = req.fields.brand;
        }
      }
      if (details[i].TAILLE) {
        if (req.fields.size) {
          details[i].TAILLE = req.fields.size;
        }
      }
      if (details[i].ÉTAT) {
        if (req.fields.condition) {
          details[i].ÉTAT = req.fields.condition;
        }
      }
      if (details[i].COULEUR) {
        if (req.fields.color) {
          details[i].COULEUR = req.fields.color;
        }
      }
      if (details[i].EMPLACEMENT) {
        if (req.fields.location) {
          details[i].EMPLACEMENT = req.fields.location;
        }
      }
    }

    // Notifie Mongoose que l'on a modifié le tableau product_details
    offerToModify.markModified("product_details");

    if (req.files.picture) {
      const result = await cloudinary.uploader.upload(req.files.picture.path, {
        public_id: `api/vinted/offers/${offerToModify._id}/preview`,
      });
      offerToModify.product_image = result;
    }

    await offerToModify.save();

    res.status(200).json("Offer modified succesfully !");
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
