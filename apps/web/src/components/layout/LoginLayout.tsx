import styled from 'styled-components';

type Props = {
  children: JSX.Element;
};

export function AuthLayout({ children }: Props) {
  return (
    <>
      <div className="auth-container">{children}</div>
    </>
  );
}
