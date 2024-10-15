"use client";

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from '@/styles/login.module.css';

const LoginPage = () => {
  const { data: session } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Function to generate a timestamp string
  const generateTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  };

  useEffect(() => {
    if (session) {
      // Fetch the assistant ID after successful login
      fetchAssistantId()
        .then((assistantId) => {
          if (assistantId) {
            // Store assistantId and redirect
            sessionStorage.setItem('assistantId', assistantId);
            router.push('/modules');
          } else {
            console.error('No assistant found for the user.');
          }
        })
        .catch((error) => {
          console.error('Error fetching assistant:', error);
        });
    }
  }, [session, router]);

  // Function to fetch the assistant ID from the database
  const fetchAssistantId = async () => {
    try {
      const response = await fetch('/api/getAssistantId', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id, // Assuming the session contains user ID
        }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      return data.assistantId; // Return the assistant ID
    } catch (error) {
      console.error('Error fetching assistant ID:', error);
      throw error;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);  // Start the loading spinner

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,  // Prevent automatic redirect so you can handle it manually
      });

      if (result?.error) {
        console.error('Sign in failed:', result.error);
        alert('Sign in failed. Please check your credentials.');
        setIsLoading(false);  // Stop loading spinner on failure
      } else {
        // Sign in successful, redirect user
        console.log('Sign in successful');

        // Optionally delay to show spinner for a moment, then redirect
        router.push('/assistant');  // Redirect to your dashboard or other page
      }
    } catch (error) {
      console.error('An error occurred during sign in:', error);
      setIsLoading(false);  // Stop loading spinner on error
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logo}>
        <Image 
            src="/bw_logo.png"
            alt="Cinetech Logo"
            width={500}
            height={500}
        />
      </div>
      <div className={styles.innerContainer}>
        <h2 className={styles.heading}>
          Sign in to your account
        </h2>
        <form className={styles.form} onSubmit={handleLogin}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className={styles.inputGroup}>
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className={styles.inputTop}
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={styles.inputBottom}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className={`${isLoading ? styles.submitButtonLoading : styles.submitButton}`}
            disabled={isLoading} // Disable the button while loading
          >
            {isLoading ? <div className={styles.spinner}></div> : 'Sign In'}
          </button>
        </form>
        {!session && (
          <div className={styles.signupLink}>
            <p>Don&apos;t have an account? <a href="/signup" className={styles.link}>Sign up</a></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
