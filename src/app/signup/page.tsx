"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from '@/styles/signup.module.css';

const SignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [assistantName, setAssistantName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [accountType, setAccountType] = useState('');
  const router = useRouter();

  const checkUsernameEmail = async () => {
    try {
      console.log('Username and email to check:', [username, email]);
      const response = await fetch(`/api/checkUser?username=${username}&email=${email}`);
      const data = await response.json();

      if (data.exists) {
        if (data.username === username) {
          setErrorMessage('Username already taken');
        } else {
          setErrorMessage('Email already in use');
        }
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Error checking username/email:', error.message);
      setErrorMessage('An error occurred. Please try again.');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await checkUsernameEmail();
    if (!isValid) return;

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        username,
        password,
        assistantName,
        accountType,
      }),
    });

    if (response.ok) {
      router.push('/login');
    } else {
      const data = await response.json();
      alert(data.message);
    }
  };

  const handleCheckout = async () => {
    try {
      const res = await fetch('/api/checkoutSession', {
        method: 'POST',
      });
  
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Navigate to the Stripe Checkout page
      } else {
        throw new Error('No URL returned from Stripe');
      }
    } catch (error) {
      console.error('Failed to initiate Stripe Checkout:', error);
    }
  };
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errorMessage.includes('Email')) {
      setErrorMessage('');
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (errorMessage.includes('Username')) {
      setErrorMessage('');
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.formContainer}>
        <div className={styles.logo}>
          <Image
              src="/bw_logo.png"
              alt="Cinetech Logo"
              width="500"
              height="500"
              className={styles.cinetechArtImage}
          />
        </div>
        <div>
          <h2 className={styles.heading}>Create your account</h2>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className={styles.inputGroup}>
            {/* First Name */}
            <div>
              <input
                id="first-name"
                name="first-name"
                type="text"
                required
                className={styles.inputField}
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            {/* Last Name */}
            <div>
              <input
                id="last-name"
                name="last-name"
                type="text"
                required
                className={styles.inputField}
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            {/* Email */}
            <div>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={styles.inputField}
                placeholder="Email"
                value={email}
                onChange={handleEmailChange}
              />
              {errorMessage.includes('Email') && <p className={styles.errorText}>{errorMessage}</p>}
            </div>
            {/* Username */}
            <div>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={styles.inputField}
                placeholder="Username"
                value={username}
                onChange={handleUsernameChange}
              />
              {errorMessage.includes('Username') && <p className={styles.errorText}>{errorMessage}</p>}
            </div>
            {/* Password */}
            <div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={styles.inputField}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {/* Assistant Name */}
            <div>
              <input
                id="assistant-name"
                name="assistant-name"
                type="text"
                className={styles.inputField}
                placeholder="Assistant Name (optional)"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
              />
            </div>
            {/* Account Type */}
            <div>
              <input
                id="account-type"
                name="account-type"
                type="text"
                className={`${styles.inputField} ${styles.hidden}`}
                placeholder="Account Type"
                defaultValue={'standard'}
                onChange={(e) => setAccountType(e.target.value)}
              />
            </div>
          </div>
  
          <div>
            <button
              type="submit"
              className={styles.button}
            >
              Create Account
            </button>
          </div>
        </form>
        <div>
        </div>
      </div>
    </div>
  );  
};

export default SignUp;
