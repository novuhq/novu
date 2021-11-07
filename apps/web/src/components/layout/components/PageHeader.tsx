import styled from 'styled-components';

export function PageHeader({ actions, title }: { actions?: JSX.Element; title: string }) {
  return (
    <HeaderWrapper className="border-bottom">
      <div className="container">
        <div className="d-md-flex py-2 flex-row align-items-center justify-content-between">
          <h2>{title}</h2>
          {actions && <div>{actions}</div>}
        </div>
      </div>
    </HeaderWrapper>
  );
}

const HeaderWrapper = styled.div`
  padding: 25px;
  background: white;
  margin-top: -25px;
  margin-left: -25px;
  margin-right: -25px;
  margin-bottom: 25px;

  h2 {
    margin-bottom: 0;
  }
`;
