import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GamePage from "./pages/GamePage";
// import CoinGamePage from "./pages/CoinGamePage"; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        {/* <Route path="/coin" element={<CoinGamePage />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
