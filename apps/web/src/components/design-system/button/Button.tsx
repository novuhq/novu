import { Button as AntButton } from 'antd';

interface IButtonProps extends JSX.ElementChildrenAttribute {
  loading: boolean;
  type?: 'primary';
}

export function Button({ loading, children, type = 'primary' }: IButtonProps) {
  return (
    <AntButton type={type} loading={loading}>
      {children}
    </AntButton>
  );
}
