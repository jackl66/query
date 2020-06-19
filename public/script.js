var socket = io.connect("http://localhost:5000");
const messageForm = document.getElementById("send-container");
const queryInput = document.getElementById("input-query");
const fileUpload = document.getElementById("fileSubmit");
const fileInput = document.getElementById("queryFile");

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  //all the txt input
  const message = queryInput.value;
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
  var x = document.getElementById("uid").textContent;
  socket.emit("send-chat-message", {
    message: message,
    uid: x,
    time: Date.now(),
  });
  alert("submitted");
});

fileUpload.addEventListener("click", (e) => {
  e.preventDefault();
  var file = fileInput.files[0];
  //if the size is larger than 150KB, alret the user and dismiss the input

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
  var x = document.getElementById("uid").textContent;
  name = x + "_" + Date.now() + "_" + name;
  socket.emit("send-file", { file: file, filename: name });
  alert("submitted");
});

//pop-up box for duplicate value
socket.on("keysCheck", (data) => {
  if (data.result == 0) {
    alert(
      data.duplicate +
        " appear more than once in or near No." +
        data.index +
        " query"
    );
  }
});
