'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/styles/homepage.module.css';

const HomePage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  return (
    <div className={styles.pageWrapper}>
      {/* Hero Section */}
      <header className={styles.heroSection}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>CineTech AI</h1>
          <p className={styles.heroDescription}>AI for film production</p>
        </div>
        <div className={styles.headerButtons}>
          <Link href="/login">
            <button className={styles.loginButton}>Login</button>
          </Link>
        </div>
      </header>

      {/* AI Partner Section */}
      <section className={styles.aiPartnerSection}>
        <h2>Powered by Industry Leaders</h2>
        <div className={styles.logoGrid}>
          <div className={styles.logoItem}>
            <Image src="/openai_logo.svg" alt="OpenAI" width={100} height={50} />
            <p>Advanced language models from OpenAI.</p>
          </div>
          <div className={styles.logoItem}>
            <Image src="/anthropic_logo.svg" alt="Anthropic" width={100} height={50} />
            <p>Safety-driven AI from Anthropic.</p>
          </div>
          <div className={styles.logoItem}>
            <Image src="/google_logo.png" alt="Google" width={100} height={50} />
            <p>Cutting-edge AI from Google Cloud.</p>
          </div>
          <div className={styles.logoItem}>
            <Image src="/meta_logo.png" alt="Meta" width={100} height={50} />
            <p>AI advancements from Meta AI.</p>
          </div>
        </div>
      </section>

      {/* Section 1: AI & Collaboration */}
      <section className={styles.featureSection}>
        <div className={styles.mediaContainer}>
          <Image src="/ai-assistant_noback.png" alt="Intelligent Assistant" width={400} height={400} />
        </div>
        <div className={styles.textContainer}>
          <h2>AI Empowering Your Production</h2>
          <p>Utilize advanced AI to streamline your entire filmmaking process, from pre-production to post.</p>
          <p>Collaborate seamlessly in real-time with our team-focused workspace tools, built for filmmakers.</p>
        </div>
      </section>

      {/* Section 2: Content Generation & Marketing */}
      <section className={styles.featureSection}>
        <div className={styles.mediaContainer}>
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className={styles.featureVideo}
          >
            <source src="/promo_video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        <div className={styles.textContainer}>
          <h2>Generate and Promote</h2>
          <p>Our platform offers multi-media content generation to create stunning visuals, scripts, and more.</p>
          <p>Easily integrate your projects with Canva and other marketing tools to elevate your promotional efforts.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <Image src="/bw_logo.png" alt="CineTech Logo" width={500} height={500} />
        <div className={styles.footerLinks}>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact Us</Link>
          <Link href="/company-info">Company Information</Link>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
