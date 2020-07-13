/**************************************************/
/*****this file handles all the file transfer******/
/**************************************************/

let fs = require("fs");

//write to output file
function writetoOutputFile(data) {
  let path = "output/output_" + Date.now() + ".json";
  fs.writeFile(path, data, function (err) {
    if (err) {
      console.log(err);
    }
  });
}

//write to the buffer when queries.json is full
function writeTobuffer(data) {
  fs.writeFile("./input/text/buffer.json", data, function (err) {
    if (err) {
      console.log(err);
    }
  });
}

//write to queries.json to store plain text input
function writeToqueries(data) {
  fs.writeFile("./input/text/queries.json", data, function (err) {
    if (err) {
      console.log(err);
    }
  });

  //reset the empty flag
  return 0;
}

//write uploaded file to upload folder
function writeToupload(data) {
  var file = data.file;
  var path = "./input/file_upload/" + data.filename;
  fs.writeFile(path, file, function (err) {
    if (err) {
      console.log(err);
    }
  });
}

//read file from the given path
function read(path) {
  var data = fs.readFileSync(path, "utf-8");
  return data;
}

//read file names inside upload folder
function readFolder() {
  var data = fs.readdirSync("./input/file_upload");
  return data;
}

//get the statistic of queries.json
function stat() {
  var data = fs.statSync("./input/text/queries.json");
  return data;
}

//copy queries.json to output file
function CopyToOutput(path) {
  fs.copyFileSync("./input/text/queries.json", path);
}

//delete the file
function unlink(path) {
  fs.unlink(path, (err) => {
    if (err) console.log(err);
  });
}

//export functions
module.exports = {
  writeTobuffer,
  writetoOutputFile,
  writeToqueries,
  writeToupload,
  read,
  readFolder,
  stat,
  CopyToOutput,
  unlink,
};
