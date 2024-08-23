import React from 'react';
import styles from '@/styles/productorder.module.css';

const ProductOrderPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Choose Your Plan</h1>
      <div className={styles.cardContainer}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>CineTech Standard</h2>
          <p className={styles.price}>$8/month</p>
          <ul className={styles.featureList}>
            <li className={styles.featureItem}>✔ 250 Credits renewed monthly*</li>
            <li className={styles.featureItem}>✔ Basic Support</li>
            <li className={styles.featureItem}>✔ Standard Features</li>
          </ul>
          <button className={styles.button}>Get started</button>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>CineTech Pro</h2>
          <p className={styles.price}>$12/month</p>
          <ul className={styles.featureList}>
            <li className={styles.featureItem}>✔ 500 Credits renewed monthly*</li>
            <li className={styles.featureItem}>✔ Shared Workspaces</li>
            <li className={styles.featureItem}>✔ Priority Support</li>
            <li className={styles.featureItem}>✔ Advanced Features</li>
          </ul>
          <button className={styles.button}>Get started</button>
        </div>
      </div>
    </div>
  );
};

export default ProductOrderPage;
