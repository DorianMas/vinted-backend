const express = require("express");
const formidableMiddleware = require("express-formidable");
const mongoose = require("mongoose");

//connexion à la bdd
mongoose.connect("mongodb://localhost/vinted");

//création du serveur
const app = express();
app.use(formidableMiddleware());

app.get("/", (req, res) => {
  res.json({ message: "Hi" });
});

//import des routes
const usersRoutes = require("./routes/users");
app.use(usersRoutes);
const offersRoutes = require("./routes/offers");
app.use(offersRoutes);

app.listen(3000, () => {
  console.log("Server has started");
});
