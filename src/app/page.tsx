"use client";
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import styles from '@/styles/homepage.module.css';

const HomePage: React.FC = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | null>(null);

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
    };
  }, []);

  const handleSignUp = () => {
    window.location.href = '/signup';
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.videoBackground}>
        <video
          autoPlay
          loop
          muted
          playsInline
          className={styles.backgroundVideo}
        >
          <source src="/banana_grab.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* Alternatively, use an image if a video is not available */}
        {/* <Image src="/background-image.jpg" alt="Background" layout="fill" objectFit="cover" className={styles.backgroundImage} /> */}
      </div>
      
      <div className={styles.content}>
        <header className={styles.header}>
          <Image
            src="/cinetech_art.png"
            alt="Cinetech Logo"
            width={225}
            height={125}
            className={styles.overlayImage}
          />
          <h1>Welcome to the CineTech Assistant</h1>
        </header>

        <section className={styles.section}>
          <h2>Explore the Future of Filmmaking</h2>
          <p>The CineTech Assistant is designed as an advanced virtual aide for industry professionals and enthusiasts.</p>
        </section>

        <section className={styles.section}>
        <Image
            src="/testpic.png"
            alt="Cinetech Logo"
            width={225}
            height={125}
            className={styles.overlayImage}
          />
          <div className={styles.buttonContainer}>
            <Link href="/assistant">
              <button onClick={handleSignUp}>
                Try the Assistant
              </button>
            </Link>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Join the Community</h2>
          <p>Already have an account? <Link href="/login" className={styles.loginLink}>Login</Link></p>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
