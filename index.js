const express = require("express");
const app = express();
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
var socket = require("socket.io");
const io = socket(5000);

require("./passportConfig")(passport);

const { Client } = require("pg");

const client = new Client({
  database: "web",
  user: "postgres",
  password: "15372689740.Li", //your password
  host: "localhost", //your host name *name of your machine)
  port: 5432,
});

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
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: false }));
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
app.use(methodOverride("_method"));
connectToClient();
app.listen(3000, () => {
  console.log("listening on 3000");
});

app.get("/", (req, res) => {
  res.render("login.ejs");
});
//display login page
app.get("/login", (req, res) => {
  res.render("login.ejs");
});
//check users inputs and whether they can login
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/input",
    failureRedirect: "/login",
    failureFlash: true,
  })
);
//display register
app.get("/register", (req, res) => {
  res.render("register.ejs");
});
//check register inputs
app.post("/register", async (req, res) => {
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
//logout
app.delete("/logout", (req, res) => {
  req.logOut();
  res.redirect("/login");
});
//if the user didn't login, redirect to login page
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/login");
}

app.get("/input", checkAuthenticated, (req, res) => {
  //display the uid
  var uid = req.user.uid;

  res.render("query", { uid });
});
app.post("/input", (req, res) => {});

let fs = require("fs");
var isEmpty = 0;

var oldSet = [];
var Keys = ["SELECT", "FROM", "WHERE", "UPDATE", "INSERT", "DELETE"];
//read the original json file
function ReadandSet() {
  //have to use sync because we need the flags
  try {
    var data = fs.readFileSync("queries.json", "utf-8");
    //check if it is empty
    if (data.length == 0) {
      isEmpty = 1;
    } else {
      oldSet = JSON.parse(data);
    }
  } catch (e) {
    console.error("error in reading", e);
  }
}
function writetoOutputFile(data) {
  //write to output file
  let path = "output/output_" + Date.now() + ".json";
  fs.writeFile(path, data, function (err) {
    if (err) {
      console.log(err);
    }
  });
}
var isAlpha = function (ch) {
  return (
    typeof ch === "string" &&
    ch.length === 1 &&
    ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z"))
  );
};
io.on("connection", (socket) => {
  console.log("connected");
  //receive file and write it upload folder
  socket.on("send-file", (data) => {
    var file = data.file;
    var path = "upload/" + data.filename;
    fs.writeFile(path, file, function (err) {
      if (err) {
        console.log(err);
      }
    });
  });
  // dealing with text input
  socket.on("send-chat-message", async (data) => {
    let uid = data.uid;
    var message = data.message;
    file = data;
    //call the function for reading
    ReadandSet();
    //array for storing the queries
    var queryArray = [],
      input = [];
    var i = 0,
      temp = "",
      //flag to check whether encounter the first alphabet
      firstWord = 0,
      //how many queries have been separated by ;
      sentence = 0;

    //parse the input and store the queries in an array
    while (i < message.length) {
      //skip contiguous spaces
      if (message.charAt(i) == " " && !isAlpha(message.charAt(i + 1))) {
        i++;
        continue;
      }
      //skip the white space right before the first alphabet
      //e.g. " hi"
      if (
        message.charAt(i) == " " &&
        isAlpha(message.charAt(i + 1)) &&
        firstWord == 0
      ) {
        i++;
        continue;
      }

      //skip escape chars
      if (message.charAt(i) == "\n" || message.charAt(i) == "\r") {
        i++;
        continue;
      }
      //read the char one by one
      if (message.charAt(i) != ";") {
        firstWord = 1;
        temp += message.charAt(i);
      }
      //";" marks the end of the query, push the current query to the array and clear the temp
      //the query must have ; to indicate the end
      //reset the firstword flag so it will skip all the white spaces
      //before the next alphabet
      else if (message.charAt(i) == ";") {
        temp += message.charAt(i);
        sentence++;
        let check = checkKeyword(temp, sentence);
        if (check != 0) {
          input.push(temp);
        }
        temp = "";
        firstWord = 0;
      }

      i++;
    }
    //only write to the file if queryArray is not empty
    if (input.length != 0) {
      //the length of the queries
      var num = input.length;
      let queryWithtime = {
        time: data.time,
        numOfqueries: num,
        queries: input,
      };
      queryArray.push(queryWithtime);
      //array for storing the record
      let querySet = [];
      //cases for writing
      //1. if the file is empty, just write to the file
      if (isEmpty == 1) {
        console.log("first write");
        querySet.push({
          id: uid,
          queryInformation: queryArray,
        });
        //prepare json data
        var jsondata = JSON.stringify(Array.from(querySet));
        writetoFile(jsondata);
      }
      //2. if the file is not empty
      else {
        //check if the user is already existed
        var index = 0,
          flag = 0;
        for (; index < oldSet.length; index++) {
          if (oldSet[index].id == uid) {
            flag = 1;
            console.log("existed");
            break;
          }
        }
        //2.1 if he is an old user, update his queries by id
        if (flag == 1) {
          var size = input.length;
          let queryWithtime = {
            time: data.time,
            numOfqueries: size,
            queries: input,
          };
          //if the first file is full, write to the buffer
          //when write to the buffer, each input is separated from the previous inputs
          //if there is any. So even the same user will have mutiple records
          //in the buffer if queries.json is full
          var sizeChecking = JSON.stringify(oldSet);
          if (sizeChecking.length >= 850000) {
            var buffer1 = fs.readFileSync("buffer.json", "utf-8");
            //if the buffer is not empty
            if (buffer1.length > 0) {
              buffer1 = JSON.parse(buffer1);
              let temp = [];
              temp.push({
                id: uid,
                queryInformation: queryWithtime,
              });
              buffer1.push(temp[0]);
              var jsondata = JSON.stringify(buffer1);
              console.log("write to buffer case 1");
              writetoFile2(jsondata);
            } else {
              //first write to the buffer
              console.log("write to buffer case 2");
              let temp = [];
              temp.push({
                id: uid,
                queryInformation: queryWithtime,
              });
              var buferfile = JSON.stringify(Array.from(temp));
              writetoFile2(buferfile);
            }
          }
          //if there is still room in queries.json
          //write to queries.json
          else {
            //prepare json data
            //update the old one if there is room left
            oldSet[index].queryInformation.push(queryWithtime);
            var jsondata = JSON.stringify(Array.from(oldSet));
            writetoFile(jsondata);
          }
        }
        //2.2 else write to the file as a new user
        else {
          console.log("write for new");
          querySet.push({
            id: uid,
            queryInformation: queryArray,
          });
          //if the first file is full, write to the buffer
          var sizeChecking = JSON.stringify(oldSet);
          if (sizeChecking.length >= 900000) {
            var bufferData = fs.readFileSync("buffer.json", "utf-8");
            //if the buffer is not empty
            if (bufferData.length > 0) {
              //update buffer.json as a new user
              bufferData = JSON.parse(bufferData);
              bufferData.push(querySet[0]);
              var jsondata = JSON.stringify(Array.from(bufferData));
              console.log("write to buffer case 3");
              writetoFile2(jsondata);
            } else {
              //first write to the buffer as a new user
              console.log("write to buffercase 4");
              var buferfile = JSON.stringify(Array.from(querySet));
              writetoFile2(buferfile);
            }
          }
          //if there is still room in queries.json
          //write to queries.json
          else {
            //prepare json data
            oldSet.push(querySet[0]);
            var jsondata = JSON.stringify(Array.from(oldSet));
            writetoFile(jsondata);
          }
        }
      }
    }
  });

  //check if there is any duplicate keyword
  function checkKeyword(query, index) {
    var flag2 = 1;
    //holds duplicate keywords
    var keyword = [];
    query = query.toLocaleUpperCase();
    //console.log(query);
    Keys.forEach(function (key) {
      //console.log(key);
      var first = query.indexOf(key);
      var last = query.lastIndexOf(key);
      //  console.log(first, "   ", last);
      if (first != last) {
        flag2 = 0;
        keyword.push(key);
      }
    });
    if (flag2 == 0) {
      //pop up an alert
      socket.emit("keysCheck", {
        index: index,
        result: 0,
        duplicate: keyword,
      });
    }

    return flag2;
  }
});

//gnerate the final output file
var loop = setInterval(function () {
  console.log(`start ${Date.now()}`);
  //if they are empty
  var uploadFlag = 0,
    bufferFlag = 0;
  //first check the buffer and upload folder, if either of them is not empty
  //transfer the data to the final output file
  var checkUpload = fs.readdirSync("upload");
  if (checkUpload.length != 0) uploadFlag = 1;
  var checkBuffer = fs.readFileSync("buffer.json", "utf-8");
  if (checkBuffer.length != 0) {
    checkBuffer = JSON.parse(checkBuffer);
    bufferFlag = 1;
  }
  //holds the final output
  let output = [],
    //size of the output file
    fileSize = 0;
  //Both uploaded files and buffer are "QUEUE", the oldest submission is in the front
  //pick the oldest submission from each of them and write to final output file
  /******************************************************************************      */
  /*   In this version, the code will pick one from buffer and one from upload folder  */
  /*   and write them to the output file in the order of their time stamp              */
  /*   to avoid starvation                                                             */
  /******************************************************************************      */

  while (checkUpload.length > 0 || checkBuffer.length > 0) {
    fileSize = JSON.stringify(Array.from(output)).length;
    console.log("current output file size " + fileSize);
    //now we have the max queries, write them to the output file
    if (fileSize >= 850000) {
      console.log("Reach maximum size for output file");
      break;
    }
    //get the first element from each sources
    let oldestFile = checkUpload[0],
      oldestBuffer = checkBuffer[0];

    //time2 holds time stamp of the first uploaded file
    var time2 = "",
      userID = "";

    //get the oldest buffer submission
    if (checkBuffer.length > 0) {
      //time1 holds the time stamp of the first submission from the buffer
      var time1 = oldestBuffer.queryInformation.time;
    }
    //get the oldest file
    if (checkUpload.length > 0) {
      //read the content
      let path = "upload/" + oldestFile;
      try {
        var fileContent = fs.readFileSync(path);
        fileContent = fileContent.toString();
        //array to hold the query
        var filequery = [];
        //how many queries have been separated by ;

        var count = 0;
        let i = 0,
          iterator = "",
          //flag to check whether encounter the first alphabet
          firstWord = 0;

        //separate the query by ;
        while (i < fileContent.length) {
          //skip contiguous spaces
          if (
            fileContent.charAt(i) == " " &&
            !isAlpha(fileContent.charAt(i + 1))
          ) {
            i++;
            continue;
          }
          //skip the white space right before the first alphabet
          //e.g. " hi"
          else if (
            fileContent.charAt(i) == " " &&
            isAlpha(fileContent.charAt(i + 1)) &&
            firstWord == 0
          ) {
            i++;
            continue;
          }
          //skip escape chars
          else if (
            fileContent.charAt(i) == "\n" ||
            fileContent.charAt(i) == "\r"
          ) {
            i++;
            continue;
          }
          //read the char one by one
          if (fileContent.charAt(i) != ";") {
            firstWord = 1;
            iterator += fileContent.charAt(i);
          }
          //";" marks the end of the query, push the current query to the array and clear the temp
          //the query must have ; to indicate the end
          //reset the firstword flag so it will skip all the white spaces
          //before the next alphabet
          else if (fileContent.charAt(i) == ";") {
            iterator += fileContent.charAt(i);
            count++;
            filequery.push(iterator);
            iterator = "";
            firstWord = 0;
          }

          i++;
        }
      } catch (e) {
        console.log(e);
      }
      //parse uid and time from the file name. UID and time stamp are separated by _
      let i = 0;

      while (oldestFile[i] != "_") {
        userID += oldestFile[i];
        i++;
      }
      userID = Number(userID);
      //compose time stamp, starting from index +1,in order to skip "_"
      i++;
      while (i < oldestFile.length) {
        time2 += oldestFile[i];
        i++;
        //the second "_" indicates the end of time stamp
        if (oldestFile[i] == "_") {
          time2 = Number(time2);
          break;
        }
      }
      //delete the file after we read all the content
      fs.unlink(path, (err) => {
        if (err) console.log(err);
      });
    }
    //the buffer is empty, only uploaded files
    if (checkBuffer.length == 0) {
      console.log("buffer empty");
      let queryInformation = {
        time: time2,
        numOfqueries: count,
        queries: filequery,
      };
      let temp = {
        id: userID,
        queryInformation: queryInformation,
      };
      output.push(temp);
      //remove the oldest element in the upload folder
      checkUpload.splice(0, 1);
    }
    //the upload folder is empty, only buffer
    else if (checkUpload.length == 0) {
      console.log("folder empty");
      output.push(oldestBuffer);
      //remove the oldest buffer
      checkBuffer.splice(0, 1);
    }
    //if the file is older, push that first
    else if (time1 > time2) {
      console.log("time1");
      //construct output format for the file
      let queryInformation = {
        time: time2,
        numOfqueries: count,
        queries: filequery,
      };
      let temp = {
        id: userID,
        queryInformation: queryInformation,
      };
      output.push(temp);
      output.push(oldestBuffer);
      //remove the oldest buffer
      checkBuffer.splice(0, 1);
      //remove the oldest element in the upload folder
      checkUpload.splice(0, 1);
    }
    //the buffer is earlier
    else if (time1 < time2) {
      console.log("time2");
      //construct output format for the file
      let queryInformation = {
        time: time2,
        numOfqueries: count,
        queries: filequery,
      };
      let temp = {
        id: userID,
        queryInformation: queryInformation,
      };
      output.push(oldestBuffer);
      output.push(temp);

      //remove the oldest buffer
      checkBuffer.splice(0, 1);
      //remove the oldest element in the upload folder
      checkUpload.splice(0, 1);
    }
  }
  //if we transfer anything
  if (output.length != 0) {
    //write to the output file
    output = JSON.stringify(Array.from(output));
    writetoOutputFile(output);
    checkBuffer = JSON.stringify(Array.from(checkBuffer));
    //update the buffer
    fs.writeFile("buffer.json", checkBuffer, function (err) {
      if (err) {
        console.log(err);
      }
    });
    /************************************************************** */
    //here we should call the accelerator and empty the output file
    //so that we can repeat the process, for now, just stop the loop
    /************************************************************** */

    console.log(`end ${Date.now()}`);
    // clearInterval(loop);
  }

  //after transfering buffer and uploaded file
  //now we gonna deal with queries.json which is the text input
  else {
    //since we put the 1M litmit on queries.json
    //we can simply move the data in queries.json to outputfile if queries.json is not empty
    //now check if it is empty
    let stats = fs.statSync("queries.json");
    let fileSizeInBytes = stats["size"];
    console.log(fileSizeInBytes);
    if (fileSizeInBytes != 0) {
      let path = "output/output_" + Date.now() + ".json";
      fs.copyFileSync("queries.json", path);
      //clear queries.json
      fs.writeFile("queries.json", "", function (err) {
        if (err) console.log(err);
      });
    }

    /************************************************************** */
    //here we should call the accelerator and empty the output file
    //so that we can repeat the process, for now, just stop the loop
    /************************************************************** */
    console.log(`finish transfering ${Date.now()}`);
    //clearInterval(loop);
  }
}, 15000);

function writetoFile2(data) {
  //write to the buffer when queries.json is full
  fs.writeFile("buffer.json", data, function (err) {
    if (err) {
      console.log(err);
    }
  });
}
function writetoFile(data) {
  //write to file
  fs.writeFile("queries.json", data, function (err) {
    if (err) {
      console.log(err);
    }
  });

  //reset the empty flag
  isEmpty = 0;
}

/*
 * Function to connect to client
 */
async function connectToClient() {
  try {
    //attempt to connect to client
    await client.connect();
  } catch (e) {
    //catch and log errors
    console.error("could not connect..", e);
  } finally {
    //log successful completion of try block
    console.log("successfully connected to client db..");
  }
}

/*
 * Function to disconnect from client
 */
async function disconnectFromClient() {
  try {
    await client.end();
  } catch (e) {
    console.error("could not disconnect..", e);
  } finally {
    console.log("successfully disconnected from client db..");
  }
}
