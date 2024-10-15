'use client';

import { useRouter } from 'next/navigation';
import styles from '@/styles/modules.module.css'; // CSS styles

const LandingPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Welcome to CineTech</h1>
      <div className={styles.iconRow}>
        {/* Assistant Button */}
        <div
          className={styles.iconButton}
          onClick={() => router.push('/assistant')} // Navigate to Assistant page
        >
          <div className={styles.icon}>
            <img src="/ai-assistant_noback.png" alt="Assistant" className={styles.iconImage} />
          </div>
          <p className={styles.iconLabel}>Assistant</p>
        </div>

        {/* Content Libraries Button */}
        <div
          className={styles.iconButton}
          onClick={() => router.push('/contentlibraries')} // Navigate to Content Libraries page
        >
          <div className={styles.icon}>
            <img src="/content_icon.png" alt="Content Libraries" className={styles.iconImage} />
          </div>
          <p className={styles.iconLabel}>Content Libraries</p>
        </div>

        {/* Production Scheduler Button */}
        <div
          className={styles.iconButton}
          onClick={() => router.push('/scheduler')} // Navigate to Production Scheduler page
        >
          <div className={styles.icon}>
            <img src="/scheduler_icon.png" alt="Production Scheduler" className={styles.iconImage} />
          </div>
          <p className={styles.iconLabel}>Production Scheduler</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
