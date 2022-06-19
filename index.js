require("dotenv").config();
const express = require("express");

const bodyParser = require("body-parser");
const app = express();
const port = process.env["PORT"];
app.use(bodyParser.json({ extended: true }));

app.use(function (req, res, next) {
  for (var key in req.query) {
    req.query[key.toLowerCase()] = req.query[key];
  }
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept");
  next();
});

const actions = require("./routes/actions");
app.use("/actions", actions);

app.listen(port, () => {
  console.log("We are live on port: " + port);
});
