const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: false,
    parameterLimit: 50000,
  })
);
app.use(express.urlencoded({ extended: false }));

/************user system ****************/
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
require("./controllers/passportConfig")(passport);
app.use(flash());
app.use(
  session({
    secret: "guns,lots of guns",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
/************user system ****************/

//logout method override
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

//function to generate output file
const Output = require("./controllers/OutputGenerator");
//login register routers
const auth = require("./routers/auth.js");

app.listen(3000, () => {
  console.log("listening on 3000");
});

app.use("/", auth.router);
app.use("/login", auth.router);
app.use("/register", auth.router);

//display input page where user can input query
app.get("/input", auth.checkAuthenticated, (req, res) => {
  //display the uid
  var uid = req.user.uid;
  res.render("query", { uid });
});
//logout
app.delete("/logout", (req, res) => {
  req.logOut();
  res.redirect("/login");
});

//generate the final output file
setInterval(function () {
  Output.OutputGenerator();
}, 15000);

//connect to socket.io for data transfer
require("./controllers/Socket")();
