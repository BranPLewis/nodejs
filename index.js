const http = require("http");
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 9091;
const portListen = process.env.PORT || 9090;

app.use(express.json());
app.use(express.static("public"));
app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      callback(null, origin);
    },
  })
);

// 1: Require web sockets
app.listen(port, function () {
  console.log("Running on port 9091");
});
const websocketServer = require("websocket").server;
const httpServer = http.createServer();
httpServer.listen(portListen, function () {
  console.log("Listening.. on 9090");
});

const clients = {};
const games = {};
var gameBoard = null;
var difficulty = null;
var playerNames = [];

// 2: Assign name to server
// const server = app.listen(8080, function () {
//   console.log(`Listening server on port 8080`);
// });

// 3: Name websocket
const wss = new websocketServer({ httpServer: httpServer });

wss.on("request", (request) => {
  //connect
  const connection = request.accept(null, request.origin);
  connection.on("open", () => console.log("opened!"));
  connection.on("close", () => console.log("Closed!"));
  connection.on("message", (message) => {
    // I have receieved a message from a client
    const result = JSON.parse(message.utf8Data);
    console.log(result);
    // Creation of a new game
    if (result.method === "create") {
      const clientId = result.clientId;
      const gameId = result.gameId;
      gameBoard = result.board;
      difficulty = result.difficulty;
      games[gameId] = {
        id: gameId,
        board: gameBoard,
        difficulty: difficulty,
        clients: [],
      };
      console.log(games);
      const payLoad = {
        method: "create",
        game: games[gameId],
      };

      const con = clients[clientId].connection;
      con.send(JSON.stringify(payLoad));
    }

    // If player wants to join an existing game
    if (result.method === "join") {
      const clientId = result.clientId;
      const username = result.username;
      const gameId = result.gameId;
      if (gameId in games) {
        const game = games[gameId];
        if (game.clients.length >= 2) {
          // Max players reached
          return;
        }
        game.clients.push({
          username: username,
          clientId: clientId,
        });

        if (playerNames) playerNames.push(username);
        console.log(playerNames);

        var payLoad = {
          method: "join",
          game: game,
          username: username,
          difficulty: difficulty,
          gameId: gameId,
        };
        // Loop through all clients and tell them that other clients have joined
        game.clients.forEach((c) => {
          clients[c.clientId].connection.send(JSON.stringify(payLoad));
        });
      } else {
        //kick off
        payLoad = {
          method: "message",
          message: "That Game ID does not exist",
        };
        const con = clients[clientId].connection;
        con.send(JSON.stringify(payLoad));
      }
    }

    if (result.method === "play") {
      if (result.gameMode == "multiplayer") {
        const gameId = result.gameId;
        const game = games[gameId];
        const username = result.username;
        const board = result.board;
        const clientId = result.clientId;
        const win = result.win;
        const gameOver = result.gameOver;

        payLoad = {
          method: "play",
          board: board,
          username: username,
          clientId: clientId,
          win: win,
          gameOver: gameOver,
        };

        game.clients.forEach((c) => {
          if (c.clientId !== clientId) {
            clients[c.clientId].connection.send(JSON.stringify(payLoad));
          }
        });
      }
    }
  });

  //generate a new clientId
  const clientId = guid();
  clients[clientId] = {
    connection: connection,
  };

  const payLoad = {
    method: "connect",
    clientId: clientId,
  };
  //send back the client connect
  connection.send(JSON.stringify(payLoad));
});

// Randomly generated clientId

function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

//then to call it, plus stitch in '4' in the third group
const guid = () =>
  (
    S4() +
    S4() +
    "-" +
    S4() +
    "-4" +
    S4().substr(0, 3) +
    "-" +
    S4() +
    "-" +
    S4() +
    S4() +
    S4()
  ).toLowerCase();

// wss.on("connection", function (ws) {
//   // This is the new client connection
//   console.log("New 'ws' client connected");

//   var playerID = ws;

//   // Handle message through websocket
//   ws.on("message", function incoming(message) {
//     console.log("Got a message through WS: ", message.toString());
//     broadcast(message.toString());
//   });
//   ws.on("close", function () {
//     console.log("Client has Disconnected");
//   });
// });

// app.post("/messages", function (req, res) {
//   // Handle message through HTTP
//   console.log("Got a message through HTTP: ", req.body.message);
//   broadcast(req.body.message);
//   res.sendStatus(200);
// });

// function broadcast(message) {
//   wss.clients.forEach((client) => {
//     client.send(message);
//   });
// }
