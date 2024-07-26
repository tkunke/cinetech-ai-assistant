import React from 'react';
import styles from '@/styles/spinning-reels.module.css';

const SpinningReels = () => {
  const spinnerStyle = {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '0.5rem',
  };

  const spinnerIconStyle = {
    marginRight: '0.5rem',
    width: '30%',
    maxWidth: '50px',
  };

  const spinnerTextStyle = {
    fontSize: '1rem',
  };

  return (
    <div style={spinnerStyle}>
      <div style={spinnerIconStyle}>
      <img src="/spinning_reels.gif" alt="Loading..." style={{ width: '100%', height: 'auto' }} />
      </div>
      <p style={spinnerTextStyle}>Working on it</p>
    </div>
  );
};

export default SpinningReels;
