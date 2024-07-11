import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/logout.module.css';

export default function Logout() {
  return (
    <div className={styles.container}>
      <Link href="/">
        <Image 
          src="/cinetech_art.png"
          alt="Cinetech Logo"
          width={500}
          height={500}
        />
      </Link>
      <h1 className={styles.message}>You have been logged out.</h1>
      <Link href="/login" className={styles.signInLink}>Sign In</Link>
    </div>
  );
}
