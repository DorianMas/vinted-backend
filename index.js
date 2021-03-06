/*Activation des variables d'environnement qui se trouvent dans le fichier .env */
require("dotenv").config();

const express = require("express");
const formidableMiddleware = require("express-formidable");
const mongoose = require("mongoose");
//connexion à la bdd
mongoose.connect(process.env.MONGODB_URI);

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

//création du serveur
const app = express();
app.use(formidableMiddleware());

//protection des ressources sur le site web
const cors = require("cors");
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "Hi" });
});

//import des routes
const usersRoutes = require("./routes/users");
app.use(usersRoutes);
const offersRoutes = require("./routes/offers");
app.use(offersRoutes);

app.listen(process.env.PORT, () => {
  console.log("Server has started");
});
