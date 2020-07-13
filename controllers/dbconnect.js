require("dotenv").config();
const { Client } = require("pg");
const client = new Client();
async function connectToClient() {
  try {
    //attempt to connect to client
    await client.connect();
    return client;
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
    return client;
  } catch (e) {
    console.error("could not disconnect..", e);
  } finally {
    console.log("successfully disconnected from client db..");
  }
}

module.exports = {
  connectToClient,
  disconnectFromClient,
};
