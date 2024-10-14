'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/styles/homepage.module.css';
import AiPartnerSection from '@/components/AiPartners';
import ImageCarousel from '@/components/ImageCarousel';

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
          <h1 className={styles.heroTitle}>CineTech</h1>
          <p className={styles.heroDescription}>AI for film production</p>
        </div>
        <div className={styles.headerButtons}>
          <Link href="/login">
            <button className={styles.loginButton}>Login</button>
          </Link>
        </div>
      </header>

      {/* Render the AI Partner Section */}
      <AiPartnerSection />

      {/* Section 1: Assistant and Dataset */}
      <section className={styles.featureSection}>
        <div className={styles.mediaContainer}>
          <h2>Intelligent Assistance</h2>
          <Image src="/ai-assistant_noback.png" alt="Intelligent Assistant" width={400} height={400} />
        </div>
        <div className={styles.textContainer}>
          <h3>The power of an intelligent assistant</h3>
          <p>Cinetech gives you access to leading GenAI models, like OpenAI&apos;s ChatGPT and Anthropic&apos;s Claude to help you generate original content.</p>
        </div>
        <div className={styles.mediaContainer}>
          <h2>Industry-specific data</h2>
          <Image src="/dataset_image2.png" alt="Industry-specific data" width={400} height={400} />
        </div>
        <div className={styles.textContainer}>
          <h3>The efficiency of an AI-powered answer engine</h3>
          <p>Our industry-focused specially curated dataset means the power of these AI models is enhanced specifically for your needs as a filmmaker.</p>
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
          <h2>Take ideas from concept to reality</h2>
          <ul>
            <li>Script-to-Storyboard or Storyboard-to-Script</li>
            <li>Script Breakdown analysis</li>
            <li>Scene and Shot breakdown analysis</li>
            <li>Quickly generate scene/shot panels</li>
          </ul>
          <h2>Manage production workflows</h2>
          <ul>
            <li>Create dynamic production schedules your assistant manages</li>
            <li>Instantly create/update daily call sheets</li>
            <li>Create/Update shot lists with ease</li>
          </ul>
        </div>
      </section>

      {/* Section 1: Assistant and Dataset */}
      <section className={styles.featureSection}>
        <div className={styles.mediaContainer}>
          <h2>Real-time Shared Workspaces</h2>
          <Image src="/collaboration_noback.png" alt="Collaboration" width={400} height={400} />
        </div>
        <div className={styles.textContainer}>
          <h3>Collaborate in real-time with our team-focused workspace tools.</h3>
          <p>Cinetech gives you access to leading GenAI models, like OpenAI&apos;s ChatGPT and Anthropic&apos;s Claude to help you generate original content.</p>
        </div>
          <ImageCarousel />
        <div className={styles.textContainer}>
          <h3>The efficiency of an AI-powered answer engine</h3>
          <p>Our industry-focused specially curated dataset means the power of these AI models is enhanced specifically for your needs as a filmmaker.</p>
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
