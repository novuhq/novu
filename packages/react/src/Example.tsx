import React from 'react';

export type ExampleProps = {
  text?: string;
};

export function Example(props: ExampleProps) {
  const [count, setCount] = React.useState(0);

  return (
    <button onClick={() => setCount(count + 1)} type="button" id="example-button">
      {props.text} {count}
    </button>
  );
}
