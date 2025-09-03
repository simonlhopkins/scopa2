import EndOfGameScreen from "./EndOfGameScreen";
import MultipleScoops from "./MultipleScoops.tsx";
import {useGameStore} from "../Store/store.ts";

export default function GameUI() {
  const {scoopPromptData, endOfGameData} = useGameStore();
  return (
    <>
      {endOfGameData && <EndOfGameScreen endOfGameData={endOfGameData}/>}
      {scoopPromptData && <MultipleScoops scoopPromptData={scoopPromptData}/>}
    </>
  );
}
