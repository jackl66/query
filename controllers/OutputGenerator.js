/**************************************************/
/*****   this file generate output file      ******/
/**************************************************/
const File = require("./File");

function OutputGenerator() {
  console.log(`start ${Date.now()}`);
  //if they are empty
  var uploadFlag = 0,
    bufferFlag = 0;
  //first check the buffer and upload folder, if either of them is not empty
  //transfer the data to the final output file
  var checkUpload = File.readFolder();
  if (checkUpload.length != 0) uploadFlag = 1;
  var checkBuffer = File.read("./input/text/buffer.json");
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
      let path = "./input/file_upload/" + oldestFile;
      try {
        var fileContent = File.read(path);
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
        return 0;
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
      File.unlink(path);
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
    File.writetoOutputFile(output);
    checkBuffer = JSON.stringify(Array.from(checkBuffer));
    //update the buffer
    File.writeTobuffer(checkBuffer);

    /************************************************************** */
    //here we should call the accelerator and empty the output file
    //so that we can repeat the process, for now, just stop the loop
    /************************************************************** */

    console.log(`end ${Date.now()}`);
    // clearInterval(loop);
  }

  //after transfering buffer and uploaded file
  //now we gonna deal with queries.json which is the text input
  //since we put the 1M litmit on queries.json
  //we can simply move the data in queries.json to outputfile if queries.json is not empty
  //now check if it is empty
  let stats = File.stat();
  let fileSizeInBytes = stats["size"];
  console.log(fileSizeInBytes);
  if (fileSizeInBytes != 0) {
    let path = "output/output_" + Date.now() + ".json";
    File.CopyToOutput(path);
    //clear queries.json
    File.writeToqueries("");
  }

  /************************************************************** */
  //here we should call the accelerator and empty the output file
  //so that we can repeat the process, for now, just stop the loop
  /************************************************************** */
  console.log(`finish transfering ${Date.now()}`);
}

var isAlpha = function (ch) {
  return (
    typeof ch === "string" &&
    ch.length === 1 &&
    ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z"))
  );
};

module.exports = {
  OutputGenerator,
};
