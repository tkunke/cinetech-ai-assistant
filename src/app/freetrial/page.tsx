"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/trialaccount.module.css'; // Import the new CSS module

const TrialAccount = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [assistantName, setAssistantName] = useState('');
  const [defaultGreeting, setDefaultGreeting] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        defaultGreeting,
        accountType: 'trial'  // Specify that this is a trial account
      }),
    });

    if (response.ok) {
      router.push('/login');
    } else {
      const data = await response.json();
      alert(data.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Free Trial Info Panel */}
        <div className={styles.infoPanel}>
          <h3 className={styles.panelTitle}>Start Your Free Trial</h3>
          <p className={styles.panelText}>
            Sign up now and enjoy all the premium features, no credit card required! Your trial will include a total of 150 CineTech Credits. The trial expires after 7 days or once the balance of credits is spent.
          </p>
          <p className={styles.panelText}>
            After your trial ends, you can choose a plan that best suits your needs.
          </p>
          <ul className={styles.panelList}>
            <li className={styles.panelItem}>✔ Access to all premium features</li>
            <li className={styles.panelItem}>✔ Dedicated support</li>
            <li className={styles.panelItem}>✔ Unlimited projects and storage</li>
          </ul>
        </div>

        {/* Sign Up Form */}
        <div className={styles.formContainer}>
          <div>
            <h2 className={styles.heading}>Create an account</h2>
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
                  onChange={(e) => setEmail(e.target.value)}
                />
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
                  onChange={(e) => setUsername(e.target.value)}
                />
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
              {/* Default Greeting */}
              <div>
                <input
                  id="default-greeting"
                  name="default-greeting"
                  type="text"
                  className={styles.inputField}
                  placeholder="Default Greeting (optional)"
                  value={defaultGreeting}
                  onChange={(e) => setDefaultGreeting(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className={styles.button}
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TrialAccount;
