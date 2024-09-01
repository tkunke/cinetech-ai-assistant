"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/profile.module.css';

const UserProfileSettings = () => {
  const [username, setUsername] = useState('currentUsername'); // Replace with actual data
  const [password, setPassword] = useState('');
  const [assistantName, setAssistantName] = useState('currentAssistantName'); // Replace with actual data
  const [defaultGreeting, setDefaultGreeting] = useState('currentDefaultGreeting'); // Replace with actual data

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/user/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
        assistantName,
        defaultGreeting,
      }),
    });

    if (response.ok) {
      // Handle success (e.g., show a success message)
    } else {
      // Handle the error appropriately, e.g., show an error message to the user
      const data = await response.json();
      alert(data.message);
    }
  };

  const handleBackToAssistant = () => {
    router.push('/assistant'); // Adjust this path as needed
  };

  return (
    <div className={styles.pageContainer}>
      <button
        onClick={handleBackToAssistant}
        className={styles.customButton}
      >
        Back to Assistant
      </button>
      
      {/* Profile Information Panel */}
      <div className={styles.profileContainer}>
        <div className={styles.profileContent}>
          <form className={styles.profileForm} onSubmit={handleSubmit}>
            <div className={styles.profileSection}>
              <h3 className={styles.sectionTitle}>Profile Information</h3>
              <div className={styles.sectionContent}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>First Name</label>
                  <input
                    type="text"
                    disabled
                    className={`${styles.inputField} ${styles.disabledInput}`}
                    value={username}
                    readOnly
                  />
                  <label className={styles.inputLabel}>Last Name</label>
                  <input
                    type="text"
                    disabled
                    className={`${styles.inputField} ${styles.disabledInput}`}
                    value={username}
                    readOnly
                  />
                  <label className={styles.inputLabel}>Preferred Name</label>
                  <input
                    type="text"
                    disabled
                    className={`${styles.inputField} ${styles.disabledInput}`}
                    value={username}
                    readOnly
                  />
                  <label className={styles.inputLabel}>Username</label>
                  <input
                    type="text"
                    disabled
                    className={`${styles.inputField} ${styles.disabledInput}`}
                    value={username}
                    readOnly
                  />
                  <label className={styles.inputLabel}>Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className={styles.inputField}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <label className={styles.inputLabel}>Email</label>
                  <input
                    type="text"
                    disabled
                    className={`${styles.inputField} ${styles.disabledInput}`}
                    value={username}
                    readOnly
                  />
                  <label className={styles.inputLabel}>Avatar</label>
                  <input
                    type="text"
                    disabled
                    className={`${styles.inputField} ${styles.disabledInput}`}
                    value={username}
                    readOnly
                  />
                </div>
              </div>
            </div>
            <div className={styles.submitSection}>
              <button
                type="submit"
                className={styles.submitButton}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Assistant Settings Panel */}
      <div className={styles.assistantContainer}>
        <div className={styles.assistantContent}>
          <form className={styles.assistantForm} onSubmit={handleSubmit}>
            <div className={styles.assistantSection}>
              <h3 className={styles.sectionTitle}>Assistant Settings</h3>
              <div className={styles.sectionContent}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Assistant Name</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                  />
                  <label className={styles.inputLabel}>Custom Greeting</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={defaultGreeting}
                    onChange={(e) => setDefaultGreeting(e.target.value)}
                  />
                  <label className={styles.inputLabel}>Verbosity Setting</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={defaultGreeting}
                    onChange={(e) => setDefaultGreeting(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className={styles.submitSection}>
              <button
                type="submit"
                className={styles.submitButton}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Account Settings Panel */}
      <div className={styles.accountContainer}>
        <div className={styles.accountContent}>
          <form className={styles.accountForm} onSubmit={handleSubmit}>
            <div className={styles.accountSection}>
              <h3 className={styles.sectionTitle}>Account Settings</h3>
              <div className={styles.sectionContent}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Payment Method</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                  />
                  <label className={styles.inputLabel}>Account Type</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={defaultGreeting}
                    onChange={(e) => setDefaultGreeting(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className={styles.submitSection}>
              <button
                type="submit"
                className={styles.submitButton}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );        
};

export default UserProfileSettings;
