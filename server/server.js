require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const Player = require("./models/Player");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

const playerUsernames = {}; // socket.id => username
let waitingPlayer = null;
const rooms = {}; // roomName -> { players: [socket1, socket2], moves: {}, rematchVotes: 0 }

async function updateScore(playerUsername, winnerUsername) {
  let update = {};

  if (winnerUsername === "draw") {
    update = { $inc: { draws: 1 } };
  } else if (playerUsername === winnerUsername) {
    update = { $inc: { wins: 1 } };
  } else {
    update = { $inc: { losses: 1 } };
  }

  await Player.findOneAndUpdate({ username: playerUsername }, update, {
    upsert: true,
    new: true,
  });
}

io.on("connection", (socket) => {
  socket.on("set-username", async (username) => {
    playerUsernames[socket.id] = username;

    await Player.findOneAndUpdate(
      { username },
      {},
      { upsert: true, new: true }
    );

    if (!waitingPlayer) {
      waitingPlayer = socket;
      socket.emit("waiting");
    } else {
      const room = `${waitingPlayer.id}-${socket.id}`;
      socket.join(room);
      waitingPlayer.join(room);

      rooms[room] = {
        players: [waitingPlayer, socket],
        moves: {},
        rematchVotes: 0,
      };

      io.to(room).emit("start-game", {
        room,
        usernames: {
          [waitingPlayer.id]: playerUsernames[waitingPlayer.id],
          [socket.id]: playerUsernames[socket.id],
        },
      });

      waitingPlayer = null;
    }
  });

  socket.on("player-move", async ({ room, move }) => {
    if (!rooms[room]) return;

    rooms[room].moves[socket.id] = move;

    const [p1, p2] = rooms[room].players;
    const move1 = rooms[room].moves[p1.id];
    const move2 = rooms[room].moves[p2.id];

    if (move1 && move2) {
      let winnerId = null;
      if (move1 === move2) {
        winnerId = "draw";
      } else if (
        (move1 === "rock" && move2 === "scissors") ||
        (move1 === "paper" && move2 === "rock") ||
        (move1 === "scissors" && move2 === "paper")
      ) {
        winnerId = p1.id;
      } else {
        winnerId = p2.id;
      }

      io.to(room).emit("game-result", {
        result: winnerId,
        moves: {
          [p1.id]: move1,
          [p2.id]: move2,
        },
      });

      // 🔄 Correctly map winner ID to username
      const p1Username = playerUsernames[p1.id];
      const p2Username = playerUsernames[p2.id];

      const winnerUsername =
        winnerId === "draw" ? "draw" : playerUsernames[winnerId];

      // ✅ Update scores correctly based on username match
      await updateScore(p1Username, winnerUsername);
      await updateScore(p2Username, winnerUsername);

      // Reset room
      rooms[room].moves = {};
      rooms[room].rematchVotes = 0;
    }
  });

  socket.on("play-again", (room) => {
    if (!rooms[room]) return;
    rooms[room].rematchVotes++;
    if (rooms[room].rematchVotes === 2) {
      io.to(room).emit("start-game", { room });
      rooms[room].rematchVotes = 0;
    }
  });

  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
    if (waitingPlayer?.id === socket.id) waitingPlayer = null;

    for (const room in rooms) {
      if (rooms[room].players.find((p) => p.id === socket.id)) {
        io.to(room).emit("player-disconnected");
        delete rooms[room];
      }
    }
  });
});

app.get("/api/score/username/:username", async (req, res) => {
  const player = await Player.findOne({ username: req.params.username });
  res.json(player || { wins: 0, losses: 0, draws: 0 });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
