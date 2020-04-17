const util = require("util");

// Imports
const express = require("express");
const webRoutes = require("./routes/web");

// Express app creation
const app = express();

// Connect socket io
const server = require("http").Server(app);
const io = require("socket.io")(server);

// Configurations
const appConfig = require("./configs/app");

// View engine configs
const exphbs = require("express-handlebars");
const hbshelpers = require("handlebars-helpers");
const multihelpers = hbshelpers();
const extNameHbs = "hbs";
const hbs = exphbs.create({
  extname: extNameHbs,
  helpers: multihelpers,
});
app.engine(extNameHbs, hbs.engine);
app.set("view engine", extNameHbs);

// Receive parameters from the Form requests
app.use(express.urlencoded({ extended: true }));

app.use("/", express.static(__dirname + "/public"));

// Routes
app.use("/", webRoutes);

function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

const randomNames = [
  "Iola Cinnamon",
  "Janelle Opie",
  "Shawana Blattner",
  "Kenneth Wille",
  "Les Daniele",
  "Al Alger",
  "Magdalene Loyola",
  "Karole Keane",
  "Scot Stoller",
  "Elizabet Corbeil",
  "Jeffrey Armitage",
  "Bianca Standish",
];

let players = {};
let playersQueue = {};
let connections = [];
let connectionsInQueue = [];

const questions = ["Nombre", "Ciudad", "Animal", "Fruto"];
const letters = [...Array(26)].map((val, i) => String.fromCharCode(i + 65));
let letter;

let gameInProgress = false;
let notificationSent = false;

io.on("connection", (socket) => {
  if (gameInProgress) {
    connectionsInQueue.push(socket);
    const name = randomNames.pop();
    playersQueue[socket.id] = { name, id: socket.id };
    socket.emit("greetings", playersQueue[socket.id]);
    connectionsInQueue.forEach((socket) => {
      socket.emit("queue", playersQueue);
    });
  } else {
    connections.push(socket);
    shuffle(randomNames);
    // Recibe la conexión del cliente
    const name = randomNames.pop();
    players[socket.id] = { name, id: socket.id };
    socket.emit("greetings", players[socket.id]);

    connections.forEach((socket) => {
      socket.emit("players", players);
    });
  }

  if (Object.keys(players).length >= 2 && !notificationSent) {
    startGame();
  }

  socket.on("disconnect", function () {
    var i = connections.indexOf(socket);

    if (i !== -1) {
      connections.splice(i, 1);
      randomNames.push(players[socket.id].name);
      delete players[socket.id];
    }

    i = connectionsInQueue.indexOf(socket);
    if (i !== -1) {
      connectionsInQueue.splice(i, 1);
      randomNames.push(players[socket.id].name);
      delete playersQueue[socket.id];
    }

    if (connections.length == 0) {
      restartGame();
    }
  });

  socket.on("basta", ({ player }) => {
    connections.forEach((socket) => {
      socket.emit("basta", player);
    });
  });

  socket.on("submission", function ({ player, answers }) {
    players[player.id].answers = answers;

    let wait = false;
    for (key in players) {
      if (players[key].answers == null) {
        wait = true;
      }
    }

    if (!wait) {
      calculateResults();

      connections.forEach((socket) => {
        socket.emit("answersReady", players);
      });

      restartGame();
    }
  });
});

const restartGame = () => {
  gameInProgress = false;
  notificationSent = false;

  for (let key in players) {
    randomNames.push(players[key].name);
  }

  players = playersQueue;
  playersQueue = {};
  connections = connectionsInQueue;
  connectionsInQueue = [];

  connections.forEach((socket) => {
    socket.emit("players", players);
  });
};

const calculateResults = () => {
  let questionsWithAnswer = [];
  questions.forEach((question, index) => {
    let answersForThisQuestion = [];

    for (key in players) {
      answersForThisQuestion.push({
        player: { ...players[key], answers: null },
        answer: players[key].answers[index],
      });
    }

    questionsWithAnswer.push({
      question: question,
      answers: answersForThisQuestion,
    });
  });

  questionsWithAnswer.forEach((question) => {
    question.answers.forEach((answer) => {
      if (answer.answer === "" || answer.answer[0].toUpperCase() !== letter) {
        answer.points = 0;
      } else {
        let repeated = 1;

        question.answers.forEach((otherAnswer, index) => {
          if (answer.player.id === otherAnswer.player.id) {
          } else if (answer.answer === otherAnswer.answer) repeated++;
        });

        if (repeated > 1) {
          answer.points = Math.floor(100 / repeated);
        } else {
          answer.points = 100;
        }
      }
    });
  });

  questionsWithAnswer.forEach((question, index) => {
    question.answers.forEach((answer) => {
      players[answer.player.id].answers[index] = {
        answer: answer.answer,
        points: answer.points,
      };
    });
  });
};

const startGame = () => {
  connections.forEach((socket) => {
    socket.emit("starting");
  });

  notificationSent = true;

  setTimeout(() => {
    shuffle(letters);
    letter = letters.pop();
    connections.forEach((socket) => {
      socket.emit("started", { players, letter, questions });
    });
    gameInProgress = true;
  }, 5000);
};

// App init
server.listen(appConfig.expressPort, () => {
  console.log(
    `Server is listenning on ${appConfig.expressPort}! (http://localhost:${appConfig.expressPort})`
  );
});
