/**************************************************/
/*****        script file for the html       ******/
/**************************************************/

var socket = io.connect("http://localhost:5000");
const messageForm = document.getElementById("send-container");
const queryInput = document.getElementById("input-query");
const fileUpload = document.getElementById("fileSubmit");
const fileInput = document.getElementById("queryFile");
const closeModalButtons = document.querySelectorAll("[data-close-button]");
const overlay = document.getElementById("overlay");
/************************ */
/*function to be replaced */
/************************ */
setInterval(() => {
  //update the result area whenever a task is finished
  //right now it is simply remove one item from processing and add it to the result area
  if ($("#pending li").html() != null) {
    var result = $("#pending li").html();
    $("#pending li:first-child").remove();
    $("#completed").append(
      "<li>" +
        result +
        "   Finished at " +
        "xx:xx:xx    " +
        "Total time spent: x\n" +
        "</li>" +
        '<a id="resultLink" href="#">click here to check you result</a>'
    );
  }
}, 5000);

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  //all the txt input
  const message = queryInput.value;
  if (message.length > 0) {
    let i = 0,
      count = 0;

    while (i < message.length) {
      if (message[i] == ";") count++;
      i++;
    }
    //if the input has more than 570 queries, alret the user and dismiss the input
    if (count > 570) {
      alert(
        "The maximum number for query input is 570, you have exceeded the limit" +
          "\n\nYou have entered:" +
          count +
          " queries"
      );
      queryInput.value = "";
      return;
    }
    //if the size is larger than 150KB, alret the user and dismiss the input
    if (message.length > 150000) {
      alert(
        "The maximum size for query input is 150KB, you have exceeded the limit" +
          "\n\nYour input's size:" +
          message.length / 1000 +
          " KB"
      );
      queryInput.value = "";
      return;
    }
    //unique id for each user
    var unix_timestamp = new Date();
    var x = document.getElementById("uid").textContent;
    x = Number(x);
    //emit the input
    socket.emit("send-chat-message", {
      message: message,
      uid: x,
      time: unix_timestamp.getTime(),
    });
    //get the timestamp in the format 19:01:11 Jul,2 2020
    let formattedTime = timeparser(unix_timestamp);
    //update the processing queue
    $("#pending").append(
      "<li> <span>Text input</span>" +
        "   Submitted at   " +
        formattedTime +
        "</li>"
    );
    //open the modal to inform the user his query has been submitted
    //if there is no duplicate
    var messageModal = document.getElementById("textSubmit");
    const modal = document.querySelector(messageModal.dataset.modalTarget);
    openModal(modal);
  }
});

fileUpload.addEventListener("click", (e) => {
  e.preventDefault();
  var file = fileInput.files[0];
  //if the size is larger than 150KB, alret the user and dismiss the input
  if (fileInput.files.length > 0) {
    if (file.size > 150000) {
      alert(
        "The maximum size for query input is 150KB, you have exceeded the limit" +
          "\n\nYour file's size:" +
          file.size / 1000 +
          " KB"
      );
      queryInput.value = "";
      return;
    }
    //file name= uid + original file name
    var name = file.name;
    var unix_timestamp = new Date();
    var x = document.getElementById("uid").textContent;
    name = x + "_" + unix_timestamp.getTime() + "_" + name;
    let formattedTime = timeparser(unix_timestamp);
    $("#pending").append(
      "<li><span>" +
        file.name +
        "</span>   Submitted at  " +
        formattedTime +
        "</li>"
    );
    socket.emit("send-file", { file: file, filename: name });
    var messageModal = document.getElementById("fileSubmit");
    const modal = document.querySelector(messageModal.dataset.modalTarget);
    openModal(modal);
  } else console.log("0" + fileInput.files.length);
});

//pop-up box for duplicate value
socket.on("keysCheck", (data) => {
  if (data.result == 0) {
    alert(
      data.duplicate +
        " appear more than once in or near No." +
        data.index +
        " query" +
        "\nNo." +
        data.index +
        " query" +
        "has been discarded"
    );
  }
});

//create the fade in effect and close the modal if the user click on the screen
overlay.addEventListener("click", () => {
  const modals = document.querySelectorAll(".modal.active");
  modals.forEach((modal) => {
    closeModal(modal);
  });
});

//close the modal when the "x" sign is clicked
closeModalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modal = button.closest(".modal");
    closeModal(modal);
  });
});

function openModal(modal) {
  if (modal == null) return;
  modal.classList.add("active");
  overlay.classList.add("active");
}

function closeModal(modal) {
  if (modal == null) return;
  modal.classList.remove("active");
  overlay.classList.remove("active");
}

//parse unix time to human readable format
function timeparser(unix_timestamp) {
  //construct timestamp
  var months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  var year = unix_timestamp.getFullYear();
  var month = months[unix_timestamp.getMonth()];
  var date = unix_timestamp.getDate();
  // Hours part from the timestamp
  var hours = unix_timestamp.getHours();
  // Minutes part from the timestamp
  var minutes = "0" + unix_timestamp.getMinutes();
  // Seconds part from the timestamp
  var seconds = "0" + unix_timestamp.getSeconds();

  // Will display time in 10:30:23 format
  var formattedTime =
    hours +
    ":" +
    minutes.substr(-2) +
    ":" +
    seconds.substr(-2) +
    "  " +
    month +
    "," +
    date +
    " " +
    year;

  return formattedTime;
}
