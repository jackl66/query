const LocalStrategy = require("passport-local").Strategy;

const bcrypt = require("bcrypt");

const { Client } = require("pg");

const client = new Client({
  database: "web",
  user: "postgres",
  password: "15372689740.Li", //your password
  host: "localhost", //your host name *name of your machine)
  port: 5432,
});

client.connect();

module.exports = function (passport) {
  const authenticateUser = (email, password, done) => {
    client
      .query("select * from users where email=$1", [email])
      .then((results) => {
        // console.log(results.rows)
        if (results.rows.length > 0) {
          const user = results.rows[0];
          try {
            //check the password
            bcrypt.compare(password, user.password, (err, isMatch) => {
              if (err) throw err;
              if (isMatch) {
                return done(null, user);
              } else {
                return done(null, false, { message: "Password incorrect" });
              }
            });
          } catch (e) {
            return done(e);
          }
        }

        //if there is no such a user
        else
          return done(null, false, {
            message: "Email address isn't registered",
          });
      })
      .catch((err) => {
        console.log("err", err);
        res.redirect("register");
      });
  };

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      authenticateUser
    )
  );
  passport.serializeUser((user, done) => done(null, user.uid));
  passport.deserializeUser((uid, done) => {
    client
      .query("select * from users where uid=$1", [uid])
      .then((results) => {
        return done(null, results.rows[0]);
      })
      .catch((err) => {
        console.log("err", err);
        res.redirect("register");
      });
  });
};
