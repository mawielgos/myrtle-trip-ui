import { useState } from "react";
import { finalizeRound, getRoundStatus, saveBulkScores } from "../api/rounds";

function createEmptyPlayersFromStatus(status) {
  const players = status?.players || [];
  return players.map((p) => ({
    playerId: p.playerId,
    playerName: p.playerName,
    holes: Array(18).fill(""),
  }));
}

export default function HomePage() {
  const [roundId, setRoundId] = useState("");
  const [roundStatus, setRoundStatus] = useState(null);
  const [players, setPlayers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleLoadRound() {
    setError("");
    setMessage("");

    if (!roundId) {
      setError("Please enter a round ID.");
      return;
    }

    try {
      const data = await getRoundStatus(roundId);
      setRoundStatus(data);
      setPlayers(createEmptyPlayersFromStatus(data));
    } catch (err) {
      setRoundStatus(null);
      setPlayers([]);
      setError(
        err.response?.data?.message ||
          "Could not load round. That may just mean the round does not exist yet."
      );
    }
  }

  function updateHole(playerIndex, holeIndex, value) {
    setPlayers((prev) => {
      const next = [...prev];
      next[playerIndex] = {
        ...next[playerIndex],
        holes: next[playerIndex].holes.map((h, i) =>
          i === holeIndex ? value : h
        ),
      };
      return next;
    });
  }

  async function handleSaveScores() {
    setError("");
    setMessage("");

    if (!roundId) {
      setError("Please enter a round ID.");
      return;
    }

    if (players.length === 0) {
      setError("Load a round with players first.");
      return;
    }

    try {
      const payload = {
        scorecards: players.map((p) => ({
          playerId: p.playerId,
          holes: p.holes.map((h) => (h === "" ? null : Number(h))),
        })),
      };

      await saveBulkScores(roundId, payload);
      setMessage("Scores saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save scores.");
    }
  }

  async function handleFinalizeRound() {
    setError("");
    setMessage("");

    if (!roundId) {
      setError("Please enter a round ID.");
      return;
    }

    try {
      await finalizeRound(roundId);
      setMessage("Round finalized.");

      const refreshed = await getRoundStatus(roundId);
      setRoundStatus(refreshed);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to finalize round.");
    }
  }

  return (
    <div className="page">
      <h1>Myrtle Trip UI</h1>
      <p>Round workbench for status, bulk score entry, and finalization.</p>

      <div className="toolbar">
        <input
          type="number"
          placeholder="Enter round ID"
          value={roundId}
          onChange={(e) => setRoundId(e.target.value)}
        />
        <button onClick={handleLoadRound}>Load Round</button>
        <button onClick={handleSaveScores} disabled={!roundStatus}>
          Save Scores
        </button>
        <button
          onClick={handleFinalizeRound}
          disabled={!roundStatus || roundStatus.finalized}
        >
          Finalize Round
        </button>
      </div>

      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}

      {roundStatus && (
        <div className="round-header">
          <div><strong>Round ID:</strong> {roundId}</div>
          <div><strong>Finalized:</strong> {roundStatus.finalized ? "Yes" : "No"}</div>
          {roundStatus.roundNumber != null && (
            <div><strong>Round #:</strong> {roundStatus.roundNumber}</div>
          )}
          {roundStatus.roundDate && (
            <div><strong>Date:</strong> {roundStatus.roundDate}</div>
          )}
          {roundStatus.courseName && (
            <div><strong>Course:</strong> {roundStatus.courseName}</div>
          )}
          {roundStatus.teeName && (
            <div><strong>Tee:</strong> {roundStatus.teeName}</div>
          )}
        </div>
      )}

      {players.length > 0 && (
        <div className="score-grid-wrap">
          <table className="score-grid">
            <thead>
              <tr>
                <th>Player</th>
                {Array.from({ length: 18 }, (_, i) => (
                  <th key={i}>H{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((player, playerIndex) => (
                <tr key={player.playerId}>
                  <td>{player.playerName}</td>
                  {player.holes.map((score, holeIndex) => (
                    <td key={holeIndex}>
                      <input
                        type="number"
                        min="1"
                        value={score}
                        onChange={(e) =>
                          updateHole(playerIndex, holeIndex, e.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {roundStatus && (
        <pre className="result-box">
          {JSON.stringify(roundStatus, null, 2)}
        </pre>
      )}
    </div>
  );
}