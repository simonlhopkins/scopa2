import { useEffect, useState } from "react";
import styled from "styled-components";
import { EventBus } from "../EventBus";
import GameState from "../Game/GameState";

export default function EndOfGameScreen() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const endOfGameHandler = (data: GameState) => {
      setEnabled(true);
    };
    EventBus.on("endGame", endOfGameHandler);
    const newGameHandler = (data: GameState) => {
      setEnabled(false);
    };
    EventBus.on("newGame", newGameHandler);
    return () => {
      EventBus.off("endGame", endOfGameHandler);
      EventBus.off("newGame", newGameHandler);
    };
  }, []);
  return (
    <StyledWrapper style={{ display: enabled ? "block" : "none" }}>
      <h1>end of game</h1>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  pointer-events: all;
  width: 400px;
  height: 400px;
  background-color: white;
  color: black;
  border-radius: 20px;
`;
