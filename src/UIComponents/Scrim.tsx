import styled from "styled-components";


interface Props {
  children?: React.ReactNode
}
export default function Scrim({children}: Props) {
  return (
    <StyledWrapper>
      {children}
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
    width: 100%;
    height: 100%;
    pointer-events: all;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
`