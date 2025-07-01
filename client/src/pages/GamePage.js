import React, { useEffect, useState } from "react";
import { socket } from "../SocketIO/socket";
import Threads from "../ThreeJS/Threads";
import Beams from "../ThreeJS/Beams";
import BlurText from "../ThreeJS/BlurText";
import GradientText from "../ThreeJS/GradientText";
import "./GamePage.css";

function GamePage() {
  const [room, setRoom] = useState(null);
  const [move, setMove] = useState(null);
  const [opponentMove, setOpponentMove] = useState(null);
  const [result, setResult] = useState(null);
  const [rematchReady, setRematchReady] = useState(false);
  const [username, setUsername] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState({ wins: 0, losses: 0, draws: 0 });
  const [myId, setMyId] = useState(null);
  const victoryAudio = new Audio("/sounds/winner.mp3");
  const lossAudio = new Audio("/sounds/looser.mp3");
  const drawAudio = new Audio("/sounds/draw.mp3");
  victoryAudio.volume = 0.7;
  lossAudio.volume = 0.7;
  drawAudio.volume = 0.7;

  useEffect(() => {
    if (!myId || result === null) return;

    if (result === "draw") {
      drawAudio.play();
    } else if (result === myId) {
      victoryAudio.play();
    } else {
      lossAudio.play();
    }
  }, [result, myId]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected as", socket.id);
      setMyId(socket.id);
    });

    socket.on("waiting", () => {
      console.log("Waiting for opponent...");
    });

    socket.on("start-game", ({ room, usernames }) => {
      setRoom(room);
      setMove(null);
      setOpponentMove(null);
      setResult(null);
      setRematchReady(false);
      setMyId(socket.id);

      if (usernames) {
        const opponentId = Object.keys(usernames).find(
          (id) => id !== socket.id
        );
        if (opponentId) {
          setOpponentName(usernames[opponentId]);
        }
      }
    });

    socket.on("game-result", ({ result, moves }) => {
      const opponentId = Object.keys(moves).find((id) => id !== socket.id);
      setOpponentMove(moves[opponentId]);
      setResult(result);
      console.log("My ID:", socket.id, "| Result from server:", result);
    });

    socket.on("player-disconnected", () => {
      alert("Opponent disconnected. Refresh to find new player.");
      setRoom(null);
    });

    return () => {
      socket.off("start-game");
      socket.off("game-result");
      socket.off("player-disconnected");
    };
  }, []);

  useEffect(() => {
    if (username && result !== null) {
      const timeout = setTimeout(() => {
        fetch(`http://localhost:5000/api/score/username/${username}`)
          .then((res) => res.json())
          .then((data) => setScore(data));
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [username, result]);

  const playMove = (m) => {
    setMove(m);
    socket.emit("player-move", { room, move: m });
    console.log("My ID:", myId, "| Result:", result);
  };

  const handleRematch = () => {
    setRematchReady(true);
    socket.emit("play-again", room);
  };

  const getResultMessage = () => {
    if (!myId || result === null) return "";
    if (result === "draw")
      return (
        <span className="playernames">
          Result: <br /> Draw! You’re evenly matched.👯
        </span>
      );
    if (result === myId)
      return (
        <span className="playernames">
          Result: <br /> Victory is yours!🏆
        </span>
      );
    return (
      <span className="playernames">
        Result: <br /> Oops! Defeated this time.💔
      </span>
    );
  };

  const handleAnimationComplete = () => {
    console.log("Animation completed!");
  };

  if (!submitted) {
    return (
      <div className="usernamescreen">
        <div className="firstscreenbg">
          <Beams
            beamWidth={2}
            beamHeight={15}
            beamNumber={12}
            lightColor="#ffffff"
            speed={2}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={0}
          />
        </div>
        <div className="firstscreen">
          <div className="titletext">
            <BlurText
              text="Enter your username to start playing !🎮"
              delay={150}
              animateBy="words"
              direction="top"
              onAnimationComplete={handleAnimationComplete}
              className="enterusernametitle"
            />
          </div>
          <input
            className="usernameinputbox"
            placeholder="Assign username here..🧙"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <br /> <br />
          <button
            className="startbutton"
            onClick={() => {
              socket.emit("set-username", username);
              setSubmitted(true);
            }}
            disabled={!username.trim()}
          >
            Start🧩
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="GameScreenParent">
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          overflow: "hidden",
          opacity: "0.6",
        }}
      >
        <Threads amplitude={1} distance={0} enableMouseInteraction={true} />
      </div>
      <div className="Gamescreencontent">
        <span className="RPStitle">Rock Paper Scissors !🎮</span>
        {room ? (
          <>
            {" "}
            <div className="mainplayer">
              <div className="scoreboardcentered">
                <div className="scoreboardparent">
                  <div className="namestab">
                    <span className="playernames">
                      {/* Room: {room} |*/} 🛡️You : <br /> {username}{" "}
                      {/*| Opponent : {opponentName}*/}
                    </span>{" "}
                  </div>
                </div>
              </div>
              <div className="scoreboardcenterd">
                <div className="scoreboardchild">
                  <GradientText
                    colors={[
                      "#40ffaa",
                      "#4079ff",
                      "#40ffaa",
                      "#4079ff",
                      "#40ffaa",
                    ]}
                    animationSpeed={3}
                    showBorder={false}
                    className="playernames"
                  >
                    ⚔️ BATTLE REPORT<br />
                    --------------------------------
                  </GradientText>
                  <div className="scoreboard">
                    <div className="wins">
                      <span style={{ color: "white" }}>
                        Wins: {score.wins}{" "}
                      </span>{" "}
                    </div>
                    <div className="loses">
                      <span
                        style={{
                          color: "white",
                        }}
                      >
                        Losses: {score.losses}{" "}
                      </span>
                    </div>
                    <div className="draw">
                      <span
                        style={{
                          color: "darkgray",
                        }}
                      >
                        {" "}
                        Draws: {score.draws}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="opponentcentered">
                <div className="opponent">
                  <div className="namestab">
                    <span className="playernames">
                      ⚔️Opponent : <br />
                      {opponentName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <br /> <br />
            {!move ? (
              <div className="gamebuttonsparent">
                <button
                  onClick={() => playMove("rock")}
                  className="gamebuttons"
                >
                  {" "}
                  ✊
                </button>
                <button
                  onClick={() => playMove("paper")}
                  className="gamebuttons"
                >
                  {" "}
                  🤚
                </button>
                <button
                  onClick={() => playMove("scissors")}
                  className="gamebuttons"
                >
                  {" "}
                  ✌️
                </button>
              </div>
            ) : (
              <p
                className="playernames"
                style={{ color: "#00e5ff", textDecoration: "underline" }}
              >
                Your selected move:{" "}
                <b
                  style={{
                    textDecoration: "none",
                    color: "#00ff99",
                    display: "inline",
                  }}
                >
                  {move}
                </b>
              </p>
            )}
            {result && (
              <div>
                <p
                  className="playernames"
                  style={{ color: "#00e5ff", textDecoration: "underline" }}
                >
                  Opponent chose:{" "}
                  <b
                    style={{
                      textDecoration: "none",
                      color: "#00ff99",
                      display: "inline",
                    }}
                  >
                    {opponentMove}
                  </b>
                </p>
                <p>{getResultMessage()}</p>
                {!rematchReady ? (
                  <button
                    onClick={handleRematch}
                    className="gamebuttons"
                    style={{
                      width: "auto",
                      height: "auto",
                      fontSize: "20px",
                      padding: "10px",
                      borderRadius: "20px",
                      position: "relative",
                    }}
                  >
                    Play Again🧩
                  </button>
                ) : (
                  <p
                    className="playernames"
                    style={{ position: "relative", top: "-20px" }}
                  >
                    Waiting for opponent to confirm..⏳
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <h2
            className="playernames"
            style={{
              position: "relative",
              top: "150px",
              color: "yellow",
              textDecoration: "underline",
            }}
          >
            Searching for a worthy rival... 🕵️‍♂️⏳
          </h2>
        )}
        {/* <br />
        <br />
        <button onClick={() => (window.location.href = "/coin")}>
          🎲 Play Heads or Tails
        </button> */}
      </div>
    </div>
  );
}

export default GamePage;
