import useStyles from './Dropdown.styles';
import React from 'react';
export function ThreeDot({ ...props }) {
  const { theme } = useStyles();

  const dot = {
    height: '7px',
    width: '7px',
    margin: '2px',
    'background-color': theme.colorScheme == 'dark' ? '#525266' : '#525266',
    'border-radius': '50%',
    display: 'inline-block',
    'font-weight': 'bold',
  };

  const threeDot = {
    cursor: 'pointer',
    padding: '5px',
    margin: '5px',
  };

  return (
    <div style={threeDot}>
      <span style={dot}></span>
      <span style={dot}></span>
      <span style={dot}></span>
    </div>
  );
}
