import { create } from 'zustand'
import GameState, {ScoopResult} from "../Game/GameState.ts";

interface ScoopPromptData {
  scoopResults: ScoopResult[],
  onChoose: (chosenScoopResult:ScoopResult) => void,
  onClose: () => void,
}
interface EndOfGameData {
  gamestate: GameState,
  onClose: () => void,
}
interface GameStore {
  endOfGameData: EndOfGameData|null
  scoopPromptData: ScoopPromptData|null
  setScoopPromptData: (data: ScoopPromptData) => void
  setEndOfGameData: (data: EndOfGameData) => void
  reset: () => void
}

const useGameStore = create<GameStore>((set) => ({
  endOfGameData: null,
  scoopPromptData: null,
  setScoopPromptData: (data) => set({ scoopPromptData: {
      ...data,
      onChoose: (chosenScoopResult:ScoopResult)=>{
        data.onChoose(chosenScoopResult);
        set({scoopPromptData: null})
      },
      onClose: ()=>{
        data.onClose();
        set({scoopPromptData: null})
      }
    } 
  }),
  setEndOfGameData: (data) => set({ endOfGameData: {
      ...data,
      onClose: ()=>{
        data.onClose();
        set({endOfGameData: null})
      }
    }
  }),
  reset: () => set({ endOfGameData: null, scoopPromptData: null })
}))

export { useGameStore, type ScoopPromptData, type EndOfGameData }