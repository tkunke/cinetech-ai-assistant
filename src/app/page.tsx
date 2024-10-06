import Image from 'next/image';
import Link from 'next/link';
import styles from '@/styles/homepage.module.css';

const HomePage: React.FC = () => {
  return (
    <div className={styles.pageWrapper}>
      {/* Hero Section */}
      <header className={styles.heroSection}>
        <h1 className={styles.heroTitle}>CineTech AI</h1>
        <p>AI for film production</p>
        <div className={styles.headerButtons}>
          <Link href="/login">
            <button className={styles.loginButton}>Login</button>
          </Link>
        </div>
      </header>

      {/* Features Overview */}
      <section className={styles.featuresSection}>
      <section className={styles.feature}>
        <div className={styles.logoGrid}>
          <Image src="/openai_logo.svg" alt="OpenAI" width={100} height={50} />
          <Image src="/anthropic_logo.svg" alt="Anthropic" width={100} height={50} />
          <Image src="/google_logo.png" alt="Google" width={100} height={50} />
          <Image src="/meta_logo.png" alt="Meta" width={100} height={50} />
        </div>
        <h3>Industry LLMs</h3>
        <p>Access advanced AI models from industry leaders to enhance your creativity and efficiency.</p>
      </section>
        <div className={styles.feature}>
          <Image src="/ai-assistant_image.png" alt="Intelligent Assistant" width={100} height={100} />
          <h3>Intelligent Assistant</h3>
          <p>Get immediate insights and creative inputs, empowering you to produce exceptional content.</p>
        </div>
        <div className={styles.feature}>
          <Image src="/collaboration_image2.png" alt="Collaboration" width={100} height={100} />
          <h3>Collaborative Workspaces</h3>
          <p>Share and edit content in real-time, ensuring seamless collaboration across your projects.</p>
        </div>
        <div className={styles.feature}>
          <Image src="/dataset_image.png" alt="Industry Dataset" width={100} height={100} />
          <h3>Curated Industry-Specific Dataset</h3>
          <p>Utilize a tailored dataset that enhances every facet of the filmmaking process.</p>
        </div>
      </section>

      {/* Video Section */}
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

      <div className={styles.featuresText}>
        <h2>Leverage AI across all phases of production</h2>
      </div>

      {/* Collaboration Tools */}
      <section className={styles.collaborationSection}>
        <h2>Designed for Teamwork</h2>
        <p>Effortlessly manage your production calendar, shot lists, and call sheets with our intelligent tools.</p>
        <Link href="/freetrial">
          <button className={styles.signupButton}>Experience Collaboration</button>
        </Link>
      </section>

      {/* Industry-Specific Insights */}
      <section className={styles.insightsSection}>
        <h2>Tailored for Every Role</h2>
        <p>From line producers to screenwriters, Cinetech enhances workflows for all filmmakers, improving efficiency and creativity.</p>
      </section>

      {/* Multi-Media Content Generation */}
      <section className={styles.contentGenerationSection}>
        <h2>Create Across Multiple Media Formats</h2>
        <p>Generate compelling text, stunning visuals, and immersive audio all in one platform.</p>
      </section>

      {/* Storyboarding and Script Tools */}
      <section className={styles.storyboardingSection}>
        <h2>Advanced Storyboarding and Script Tools</h2>
        <p>Visualize your screenplay, analyze scripts, and craft compelling narratives with ease.</p>
      </section>

      {/* Marketing Empowerment */}
      <section className={styles.marketingSection}>
        <h2>Empower Your Film Marketing</h2>
        <p>Integrate with Canva and social media to effortlessly design marketing materials and promote your film.</p>
      </section>

      {/* Final Call to Action */}
      <footer className={styles.finalCTA}>
        <h2>Join the Cinetech Revolution</h2>
        <p>Transform how films are made and marketed with the power of AI.</p>
        <Link href="/freetrial">
          <button className={styles.signupButton}>Join Us Today</button>
        </Link>
      </footer>
    </div>
  );
};

export default HomePage;
