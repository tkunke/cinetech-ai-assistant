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
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>CineTech AI</h1>
          <p className={styles.description}>AI for film production</p>
          <div className={styles.headerButtons}>
            <Link href="/login">
              <button className={styles.loginButton}>Login</button>
            </Link>
            <Link href="/signup">
              <button className={styles.signupButton}>Sign Up for Free</button>
            </Link>
          </div>
        </header>
  
        <section className={styles.section}>
          <div className={styles.imageTextContainer}>
            <Image
              src="/smokingman.png"
              alt="Cinetech Logo"
              width={225}
              height={125}
              className={styles.sectionImage}
            />
            <div className={styles.textContent}>
              <h2>Your Creative Partner</h2>
              <p>We provide AI-driven solutions for filmmakers and creatives in the entertainment industry.</p>
            </div>
            <Image
              src="/spinning_reels.gif"  /* Replace with your second image */
              alt="Another Cinetech Logo"
              width={225}
              height={125}
              className={styles.sectionImage}
            />
            <div className={styles.textContent}>
              <h2>Innovative Tools</h2>
              <p>Explore innovative tools designed to enhance your creative workflow and bring your visions to life.</p>
            </div>
          </div>
        </section>
  
        <section className={styles.videoSection}>
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
        </section>
  
        <section className={styles.bottomSection}>
          <div className={styles.bottomImageTextContainer}>
            <Image
              src="/cinetech_art.png"
              alt="Cinetech Logo"
              width={500}
              height={500}
              className={styles.bottomSectionImage}
            />
            <h2>Join the Community</h2>
            <p>Already have an account? <Link href="/login" className={styles.loginLink}>Login</Link></p>
          </div>
        </section>
      </div>
    </div>
  );      
};

export default HomePage;
