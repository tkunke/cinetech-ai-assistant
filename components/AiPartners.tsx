import { useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from '@/styles/AiPartners.module.css';

const AiPartnerSection: React.FC = () => {
  const logoScrollerRef = useRef<HTMLDivElement>(null);

  const logos = [
    { src: '/openai_logo.svg', alt: 'OpenAI' },
    { src: '/anthropic_logo.svg', alt: 'Anthropic' },
    { src: '/google_logo.png', alt: 'Google' },
    { src: '/meta_logo.png', alt: 'Meta' },
    { src: '/stability_logo.png', alt: 'Stability AI' },
    { src: '/getty_logo.svg', alt: 'Getty Images' },
  ];

  const doubledLogos = [...logos, ...logos];

  useEffect(() => {
    if (logoScrollerRef.current) {
      logoScrollerRef.current.style.setProperty('--logo-count', doubledLogos.length.toString());
    }
  }, [doubledLogos.length.toString()]);

  return (
    <section className={styles.aiPartnerSection}>
      <h2>Leverage the power of generative AI at all phases of produciton</h2>
  
      {/* Horizontal scrolling container at the top */}
      <div className={styles.horizontalScrollerContainer}>
        <div className={styles.logoScroller} ref={logoScrollerRef}>
          <div className={styles.logoList}>
            {doubledLogos.map((logo, index) => (
              <div 
                key={index}
                className={logo.alt === 'Stability AI' ? styles.stabilityLogoContainer : styles.logoContainer}
              >
                <Image src={logo.src} alt={logo.alt} width={100} height={50} />
              </div>
            ))}
          </div>
        </div>
      </div>
  
      {/* Blurb sections below the logos */}
      <div className={styles.partnerContent}>
        <div className={styles.blurb}>
          <p>
          Leveraging cutting-edge AI from industry leaders like OpenAI and Anthropic, 
          our platform puts the power of large language models at the core of film production. 
          With AI-driven insights and tools, filmmakers from all disciplines can streamline their workflows, 
          spark creativity, and bring their projects to life faster than ever.
          </p>
        </div>
  
        <div className={styles.blurb}>
          <p>
          From pre-production to post, our suite of tools is designed for every role in the filmmaking process. 
          Whether you&apos;re a director, writer, editor, or producer, our AI-enhanced platform empowers you to collaborate seamlessly, 
          generate content, and make informed decisions at every stage of production.
          </p>
        </div>
      </div>
    </section>
  );      
};

export default AiPartnerSection;
