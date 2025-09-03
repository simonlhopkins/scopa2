import styled from "styled-components";
import {EndOfGameData} from "../Store/store.ts";
import Scrim from "./Scrim.tsx";


interface Props {
  endOfGameData: EndOfGameData
}
export default function EndOfGameScreen({endOfGameData}: Props) {
  console.log(endOfGameData)
  return (
    <Scrim>
      <StyledWrapper>
        <h1>end of game</h1>
        <button onClick={()=>{
          endOfGameData.onClose();
        }}>new game</button>
        <pre>{JSON.stringify(endOfGameData.gamestate.toJson(), null, 2)}</pre>
      </StyledWrapper>
    </Scrim>
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
