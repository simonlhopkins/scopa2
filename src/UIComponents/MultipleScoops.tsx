import { useEffect, useRef, useState } from "react";
import { ScoopResult } from "../Game/GameState";
import styled from "styled-components";
import { EventBus } from "../EventBus";

export default function MultipleScoops() {
  const [scoopResults, setScoopResults] = useState<ScoopResult[]>([]);
  // const onChosenCallback = useRef()
  // EventBus.emit("multipleScoops", {
  //   scoopResults,
  //   onChosen: (chosenScoop: ScoopResult) => {
  //     this.AttemptMoveCardToTable(cardId, chosenScoop);
  //   },
  // });
  useEffect(() => {
    const scoopOptionHandler = ({ scoopResults, onChosen }: any) => {
      setScoopResults(scoopResults as ScoopResult[]);
    };
    EventBus.on("multipleScoops", scoopOptionHandler);

    return () => {
      EventBus.off("multipleScoops", scoopOptionHandler);
    };
  }, []);
  return (
    <StyledWrapper
      style={{ display: scoopResults.length == 0 ? "none" : "block" }}
    ></StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  width: 300px;
  height: 300px;
  background-color: lightblue;
  border-radius: 20px;
`;
