
import styled from "styled-components";
import {ScoopPromptData} from "../Store/store.ts";
import Card from "../Game/Card.ts";
import Scrim from "./Scrim.tsx";



interface Props {
  scoopPromptData: ScoopPromptData
}
export default function MultipleScoops({scoopPromptData}: Props) {
  
  
    return (
        <Scrim>
          <StyledPopup>
            <h1>Multiple Scoops</h1>
            <button onClick={() => {
              scoopPromptData.onClose();
            }}>close
            </button>
            <ul>
              {scoopPromptData.scoopResults.map((scoopResult, index) =>
                  <li key={index}>
                    {scoopResult.tableCards.map(card => 
                        <img key = {card.id()} src={"/assets/KIN's_Playing_Cards/" + Card.GetTextureName(card)+ ".png"}></img>
                    )}
                    
                    <button onClick={() => {
                      scoopPromptData.onChoose(scoopResult);
                    }}>choose
                    </button>
                  </li>)}
            </ul>
          </StyledPopup>
        </Scrim>)
}

const StyledPopup = styled.div`
    pointer-events: all;
    width: 300px;
    background-color: lightblue;
    border-radius: 20px;
    li{
        img{
            image-rendering: pixelated;
        }
    }
    
`;

