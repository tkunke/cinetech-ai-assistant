"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useSession } from 'next-auth/react';
import styles from '@/styles/profile.module.css';

const UserProfileSettings = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [username, setUsername] = useState('currentUsername');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [assistantName, setAssistantName] = useState('currentAssistantName');
  const [defaultGreeting, setDefaultGreeting] = useState('currentDefaultGreeting');
  const { cancelMembership } = useUser();
  const router = useRouter();

  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(false);
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const [verbosityLevel, setVerbosityLevel] = useState(2); // Default to Medium


  const toggleProfileSection = () => {
    setIsProfileExpanded(!isProfileExpanded);
  };

  const toggleAssistantSection = () => {
    setIsAssistantExpanded(!isAssistantExpanded);
  };

  const toggleAccountSection = () => {
    setIsAccountExpanded(!isAccountExpanded);
  };

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
      const data = await response.json();
      alert(data.message);
    }
  };

  const handleBackToAssistant = () => {
    router.push('/assistant');
  };

  const handleCancelMembership = async () => {
    if (userId) {
      try {
        await cancelMembership(userId);
        alert('Membership canceled successfully');
      } catch (error) {
        console.error('Error canceling membership:', error);
        alert('There was a problem canceling your membership.');
      }
    }
  };

  const verbosityMap = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
  };
  
  // Use verbosityMap[verbosityLevel] wherever you need to handle the verbosity level as a string.
  

  return (
    <div className={styles.pageContainer}>
      <button onClick={handleBackToAssistant} className={styles.customButton}>
        Back to Assistant
      </button>

      {/* Profile Information Panel */}
      <div className={styles.panelContainer}>
        <div className={styles.panelHeader} onClick={toggleProfileSection}>
          <h3 className={styles.sectionTitle}>Profile Information</h3>
        </div>
        {isProfileExpanded && (
          <form className={styles.profileForm} onSubmit={handleSubmit}>
            <div className={styles.profileSection}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Preferred Name:</label>
                <input type="text" disabled className={styles.inputField} value={preferredName} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Username:</label>
                <input type="text" disabled className={styles.inputField} value={username} readOnly />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Email:</label>
                <input type="text" disabled className={styles.inputField} value={email} readOnly />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Password:</label>
                <input type="text" disabled className={styles.inputField} value={password} readOnly />
              </div>
              {/* Add more input fields as needed */}
            </div>
            <div className={styles.submitSection}>
              <button type="submit" className={styles.submitButton}>
                Save
              </button>
            </div>
          </form>    
        )}
      </div>

      {/* Assistant Settings Panel */}
      <div className={styles.panelContainer}>
        <div className={styles.panelHeader} onClick={toggleAssistantSection}>
          <h3 className={styles.sectionTitle}>Assistant Settings</h3>
        </div>
        {isAssistantExpanded && (
          <form className={styles.profileForm} onSubmit={handleSubmit}>
            <div className={styles.profileSection}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Assistant Name:</label>
                <input type="text" disabled className={styles.inputField} value={preferredName} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Custom Greeting:</label>
                <input type="text" disabled className={styles.inputField} value={username} readOnly />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Default Model:</label>
                <input type="text" disabled className={styles.inputField} value={email} readOnly />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Verbosity:</label>
                <div className={styles.sliderContainer}>
                  <input
                    type="range"
                    className={styles.slider}
                    min="1"
                    max="3"
                    value={verbosityLevel}
                    onChange={(e) => setVerbosityLevel(Number(e.target.value))}
                  />
                  <div className={styles.sliderLabels}>
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>
              </div>
              {/* Add more input fields as needed */}
            </div>
            <div className={styles.submitSection}>
              <button type="submit" className={styles.submitButton}>
                Save
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Account Settings Panel */}
      <div className={styles.panelContainer}>
        <div className={styles.panelHeader} onClick={toggleAccountSection}>
          <h3 className={styles.sectionTitle}>Account Settings</h3>
        </div>
        {isAccountExpanded && (
          <>
            <form className={styles.profileForm} onSubmit={handleSubmit}>
              <div className={styles.profileSection}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Subscription Plan:</label>
                  <input type="text" disabled className={styles.inputField} value={preferredName} />
                </div>
                {/* Add more input fields as needed */}
              </div>
              <div className={styles.submitSection}>
                <button type="submit" className={styles.submitButton}>
                  Save
                </button>
              </div>
            </form>

            {/* Cancel Membership Button below the form */}
            <div className={styles.cancelSection}>
              <button type="button" onClick={handleCancelMembership} className={styles.cancelMembershipButton}>
                Cancel Membership
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfileSettings;
