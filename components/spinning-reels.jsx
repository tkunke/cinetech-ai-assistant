import React from 'react';
import styles from '@/styles/spinning-reels.module.css';

const SpinningReels = () => {
  return (
    <div className={styles.spinner}>
      <div className={styles.spinnerIcon}>
      <img src="/spinning_reels.gif" alt="Loading..." />
      </div>
      <p className={styles.spinnerText}>Loading...</p>
    </div>
  );
};

export default SpinningReels;
