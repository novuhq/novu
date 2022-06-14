import React from 'react';

interface IFaqProps {
  children: React.ReactNode;
}

export default function FAQ({ children }: IFaqProps) {
  return <div className="items_list">{children}</div>;
}
