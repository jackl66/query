/**************************************************/
/***** this file handles socket.io connection *****/
/**************************************************/

var socket = require("socket.io");
const io = socket(5000);
const File = require("./File");

//check if the char is alphabetical
var isAlpha = function (ch) {
  return (
    typeof ch === "string" &&
    ch.length === 1 &&
    ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z"))
  );
};
//some keywords to check to prevent duplicate
var Keys = ["SELECT", "FROM", "WHERE", "UPDATE", "INSERT", "DELETE"];
var isEmpty = 0;
var oldSet = [];

//socket.io connection
module.exports = function () {
  io.on("connection", (socket) => {
    console.log("connected to io");
    //receive file and write it upload folder
    socket.on("send-file", (data) => {
      File.writeToupload(data);
    });
    // dealing with text input
    socket.on("send-chat-message", async (data) => {
      let uid = data.uid;
      var message = data.message;
      file = data;
      //call the function for reading. Store the result in oldSet
      try {
        var filecontent = File.read("./input/text/queries.json");
        //check if it is empty
        if (filecontent.length == 0) {
          isEmpty = 1;
        } else {
          oldSet = JSON.parse(filecontent);
        }
      } catch (e) {
        console.error("error in reading", e);
      }
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
          isEmpty = File.writeToqueries(jsondata);
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
              var buffer1 = File.read("./input/text/buffer.json");
              //if the buffer is not empty, append to the old buffer first
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
                File.writeTobuffer(jsondata);
              } else {
                //first write to the buffer
                console.log("write to buffer case 2");
                let temp = [];
                temp.push({
                  id: uid,
                  queryInformation: queryWithtime,
                });
                var buferfile = JSON.stringify(Array.from(temp));
                File.writeTobuffer(buferfile);
              }
            }
            //if there is still room in queries.json
            //write to queries.json
            else {
              //prepare json data
              //update the old one if there is room left
              oldSet[index].queryInformation.push(queryWithtime);
              var jsondata = JSON.stringify(Array.from(oldSet));
              isEmpty = File.writeToqueries(jsondata);
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
            if (sizeChecking.length >= 850000) {
              var bufferData = File.read("./input/text/buffer.json");
              //if the buffer is not empty
              if (bufferData.length > 0) {
                //update buffer.json as a new user
                bufferData = JSON.parse(bufferData);
                bufferData.push(querySet[0]);
                var jsondata = JSON.stringify(Array.from(bufferData));
                console.log("write to buffer case 3");
                File.writeTobuffer(jsondata);
              } else {
                //first write to the buffer as a new user
                console.log("write to buffercase 4");
                var buferfile = JSON.stringify(Array.from(querySet));
                File.writeTobuffer(buferfile);
              }
            }
            //if there is still room in queries.json
            //write to queries.json
            else {
              //prepare json data
              oldSet.push(querySet[0]);
              var jsondata = JSON.stringify(Array.from(oldSet));
              isEmpty = File.writeToqueries(jsondata);
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
};
