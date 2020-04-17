window.socket = null;

function connectToSocketIo() {
  let server = window.location.protocol + "//" + window.location.host;
  window.socket = io.connect(server);

  hideStopButton();
  hideConnectButton();
  hideReconnectButton();

  window.socket.on("basta", function (player) {
    startCounter(player);
  });

  window.socket.on("starting", function () {
    startCountdownToGameStart();
  });

  window.socket.on("players", function (players) {
    showLobby(players);
  });

  window.socket.on("queue", function (players) {
    showQueueLobby(players);
  });

  window.socket.on("started", function (gameData) {
    setupGame(gameData);
  });

  window.socket.on("greetings", function (player) {
    window.player = player;
    const greetingsHeading = document.getElementById("greetings");
    greetingsHeading.innerHTML = `Welcome ${player.name}`;
  });

  window.socket.on("answersReady", function (players) {
    window.players = players;
    showAllAnswers();
  });
}

function emitBasta() {
  window.socket.emit("basta", { player: window.player });
}

function showLobby(players) {
  hideStopButton();
  hideConnectButton();
  hideReconnectButton();

  const playersContainer = document.getElementById("players");
  playersContainer.innerHTML = "";

  for (key in players) {
    const newNode = document.createElement("div");
    newNode.innerHTML = players[key].name;
    playersContainer.appendChild(newNode);
  }
}

function showQueueLobby(players) {
  hideStopButton();
  hideConnectButton();
  hideReconnectButton();

  const playersContainer = document.getElementById("players");
  playersContainer.innerHTML = "";

  const newNode = document.createElement("div");
  newNode.innerHTML = "Esperando a que termine el juego";
  playersContainer.appendChild(newNode);

  for (key in players) {
    const newNode = document.createElement("div");
    newNode.innerHTML = players[key].name;
    playersContainer.appendChild(newNode);
  }
}

function setupGame({ players, letter, questions }) {
  window.players = players;
  window.letter = letter;
  window.questions = questions;

  const greetingsHeading = document.getElementById("greetings");
  greetingsHeading.innerHTML = `La letra es ${letter}, ${player.name}`;

  const playersContainer = document.getElementById("players");
  playersContainer.innerHTML = "";

  const headerNode = document.createElement("div");
  headerNode.classList.toggle("input-group");
  playersContainer.appendChild(headerNode);

  const name = document.createElement("div");
  name.classList.toggle("input-group-prepend");
  name.innerHTML = `<span class="input-group-text">Nombre del jugador</span>`;
  headerNode.appendChild(name);

  questions.forEach((question, index) => {
    const inputNode = document.createElement("input");
    inputNode.type = "text";
    inputNode.classList.toggle("form-control");
    inputNode.disabled = true;
    inputNode.value = question;
    headerNode.appendChild(inputNode);
  });

  for (key in players) {
    const newNode = document.createElement("div");
    newNode.classList.toggle("input-group");
    playersContainer.appendChild(newNode);

    const titleNode = document.createElement("div");
    titleNode.classList.toggle("input-group-prepend");
    titleNode.innerHTML = `<span class="input-group-text">${players[key].name}</span>`;
    newNode.appendChild(titleNode);

    questions.forEach((question) => {
      const inputNode = document.createElement("input");
      inputNode.type = "text";
      inputNode.name = question;
      inputNode.placeholder = question;
      inputNode.classList.toggle("form-control");

      if (window.player.id == key) {
        inputNode.id = `q-${question}`;
      }

      if (window.player.id != key) {
        inputNode.disabled = true;
      }

      newNode.appendChild(inputNode);
    });
  }

  showStopButton();
  hideConnectButton();
  hideReconnectButton();
}

function showAllAnswers() {
  const players = window.players;
  const questions = window.questions;

  const playersContainer = document.getElementById("players");
  playersContainer.innerHTML = "";

  const headerNode = document.createElement("div");
  headerNode.classList.toggle("input-group");
  playersContainer.appendChild(headerNode);

  const name = document.createElement("div");
  name.classList.toggle("input-group-prepend");
  name.innerHTML = `<span class="input-group-text">Nombre del jugador</span>`;
  headerNode.appendChild(name);

  questions.forEach((question, index) => {
    const inputNode = document.createElement("input");
    inputNode.type = "text";
    inputNode.classList.toggle("form-control");
    inputNode.disabled = true;
    inputNode.value = question;
    headerNode.appendChild(inputNode);
  });

  for (key in players) {
    const newNode = document.createElement("div");
    newNode.classList.toggle("input-group");
    if (players[key].winner) newNode.classList.toggle("winner");

    playersContainer.appendChild(newNode);

    const titleNode = document.createElement("div");
    titleNode.classList.toggle("input-group-prepend");
    titleNode.innerHTML = `<span class="input-group-text">${
      players[key].winner
        ? "🏅 " + players[key].name + " (" + players[key].total + ")"
        : players[key].name + " (" + players[key].total + ")"
    }</span>`;
    newNode.appendChild(titleNode);

    questions.forEach((question, index) => {
      const inputNode = document.createElement("input");
      inputNode.type = "text";
      inputNode.name = question;
      inputNode.placeholder = question;
      inputNode.classList.toggle("form-control");
      inputNode.disabled = true;
      inputNode.value = `${players[key].answers[index].answer} (${players[key].answers[index].points})`;

      newNode.appendChild(inputNode);
    });
  }

  hideStopButton();
  hideConnectButton();
  showReconnectButton();
}

async function startCounter(player) {
  showAlertCounter();
  const counterDiv = document.getElementById("counter");
  const stopButton = document.getElementById("stop");
  stopButton.classList.toggle("hidden");

  for (let i = 1; i <= 10; i++) {
    counterDiv.innerHTML = `Basta ${i} de ${player.name}`;
    await sleep(1000);
  }

  counterDiv.innerHTML = "";
  hideAlertCounter();

  window.socket.emit("submission", {
    player: window.player,
    answers: window.questions.map((question) => {
      const questionInput = document.getElementById(`q-${question}`);
      return questionInput.value;
    }),
  });
}

async function startCountdownToGameStart() {
  showAlertCounter();
  const counterDiv = document.getElementById("counter");

  for (let i = 5; i >= 1; i--) {
    counterDiv.innerHTML = `El juego comienza en ${i} segundos`;
    await sleep(1000);
  }

  hideAlertCounter();
  counterDiv.innerHTML = "";
}

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const closeResults = () => {
  // Reset the game
  const greetingsHeading = document.getElementById("greetings");
  greetingsHeading.innerHTML = `Ingresa al juego`;
  const stopButton = document.getElementById("stop");
  stopButton.classList.toggle("hidden");
};

const hideStopButton = () => {
  const stopButton = document.getElementById("stop");
  stopButton.classList.add("hidden");
};

const showStopButton = () => {
  const stopButton = document.getElementById("stop");
  stopButton.classList.remove("hidden");
};

const hideReconnectButton = () => {
  const stopButton = document.getElementById("reconnect");
  stopButton.classList.add("hidden");
};

const showReconnectButton = () => {
  const stopButton = document.getElementById("reconnect");
  stopButton.classList.remove("hidden");
};

const hideConnectButton = () => {
  const stopButton = document.getElementById("connect");
  stopButton.classList.add("hidden");
};

const showConnectButton = () => {
  const stopButton = document.getElementById("connect");
  stopButton.classList.remove("hidden");
};

const hideAlertCounter = () => {
  const stopButton = document.getElementById("counter");
  stopButton.classList.add("hidden");
};

const showAlertCounter = () => {
  const stopButton = document.getElementById("counter");
  stopButton.classList.remove("hidden");
};
