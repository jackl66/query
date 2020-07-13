/**************************************************/
/*****    this file handles all the routes   ******/
/**************************************************/

const express = require("express");
const app = express();
const router = express.Router();
const bcrypt = require("bcrypt");
const passport = require("passport");

const bodyParser = require("body-parser");
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: false,
    parameterLimit: 50000,
  })
);
app.use(express.urlencoded({ extended: false }));

//connect to db
const { Client } = require("pg");
const user = require("../controllers/dbconnect");
const client = new Client(user);
client
  .connect()
  .then(() => console.log("connected to the database"))
  .catch((err) => {
    console.log(err);
  });

//render home page
router.get("/", checkAuthenticated, (req, res) => res.render("login"));

//render login page
router.get("/login", (req, res) => {
  res.render("login.ejs");
});

//login post request
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/input",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

//render register page
router.get("/register", (req, res) => {
  res.render("register.ejs");
});

//register post request
router.post("/register", async (req, res) => {
  let { name, email, password, password2 } = req.body;

  let errors = [];

  if (!name || !email || !password || !password2) {
    errors.push({ message: "enter all the required fields" });
  }
  if (password != password2) {
    errors.push({ message: "passwords do not match" });
  }

  if (errors.length > 0) {
    res.render("register", { errors });
  }
  //meet the minimum requirment
  else {
    let hashPassword = await bcrypt.hash(password, 10);
    client
      .query("select * from users where email=$1", [email])
      .then((results) => {
        //check if the email is being used
        if (results.rows.length > 0) {
          errors.push({ message: "email is used, please use another one" });
          res.render("register", { errors });
        }
        //otherwise, create a new user
        else {
          client.query(
            "insert into users (name,password,email) values ($1,$2,$3) returning uid,password",
            [name, hashPassword, email]
          );
        }
      })
      .then(() => {
        req.flash("success_msg", "successfully resigtered, you can login now");
        res.redirect("login");
      })
      .catch((err) => {
        console.log("err", err);
        res.redirect("register");
      });
  }
});

//log out
router.delete("/logout", (req, res) => {
  req.logOut();
  res.redirect("/login");
});

//check if the user has login
//otherwise, redirect to login page
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/login");
}

module.exports = {
  router,
  checkAuthenticated,
};
