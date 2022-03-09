const express = require("express");
const formidableMiddleware = require("express-formidable");
const mongoose = require("mongoose");
require("dotenv").config();
//connexion à la bdd
mongoose.connect(process.env.MONGODB_URI);

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