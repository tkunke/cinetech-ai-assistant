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
    width: '50%',
    maxWidth: '70px',
  };

  const spinnerTextStyle = {
    fontSize: '1rem',
  };

  return (
    <div className={styles.spinner}>
      <div className={styles.spinnerIcon}>
      <img src="/spinning_reels2.gif" alt="Loading..." style={{ width: '100%', height: 'auto' }} />
      </div>
      <p className={styles.spinnerText}>hang tight...</p>
    </div>
  );
};

export default SpinningReels;
