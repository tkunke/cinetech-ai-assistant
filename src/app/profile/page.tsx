"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useSession } from 'next-auth/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from '@/styles/profile.module.css';

const UserProfileSettings = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [username, setUsername] = useState('currentUsername');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [preferredName, setPreferredName] = useState('');
  const [assistantName, setAssistantName] = useState('currentAssistantName');
  const [status, setStatus] = useState('');
  const [creditAllotment, setCreditAllotment] = useState(0);
  const [defaultModel, setDefaultModel] = useState('chatgpt-4o');  // Default value
  const [subscriptionType, setSubscriptionType] = useState('');
  const { cancelMembership } = useUser();
  const router = useRouter();

  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(false);
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const [isEditingPreferredName, setIsEditingPreferredName] = useState(false);
  const [isEditingAssistantName, setIsEditingAssistantName] = useState(false);
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

    const updatedData = {
      preferredName,
      assistantName,
    };

    const response = await fetch(`/api/getProfileData?userId=${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData),
    });

    if (response.ok) {
      alert('Profile updated successfully.');
    } else {
      const data = await response.json();
      alert(data.message || 'Failed to update profile.');
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

  const handlePasswordReset = () => {
    setIsResettingPassword(true);  // Show the password reset input
  };

  const verbosityMap = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await fetch(`/api/getProfileData?userId=${userId}`);
        const data = await response.json();
        if (response.ok) {
          setUsername(data.user.username);
          setEmail(data.user.email);
          setPreferredName(data.user.preferredName);
          setAssistantName(data.user.assistantName);
          setStatus(data.user.status);
          setCreditAllotment(data.user.creditAllotment);
          setDefaultModel(data.user.defaultModel || 'chatgpt-4o');
          setSubscriptionType(data.user.planType);
        } else {
          console.error('Failed to fetch profile data:', data.error);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };
  
    if (userId) {
      fetchProfileData();
    }
  }, [userId]);  
  

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
                {isEditingPreferredName ? (
                  <input
                    type="text"
                    className={styles.inputField}
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    onBlur={() => setIsEditingPreferredName(false)} // Exit edit mode when focus is lost
                    autoFocus
                  />
                ) : (
                  <span onClick={() => setIsEditingPreferredName(true)} className={styles.displayField}>
                    {preferredName || 'Add a preferred name'}
                  </span>
                )}
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
                <button 
                  type="button" 
                  onClick={handlePasswordReset} 
                  className={styles.resetButton}
                >
                  Reset Password
                </button>
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
                {isEditingAssistantName ? (
                  <input
                    type="text"
                    className={styles.inputField}
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    onBlur={() => setIsEditingAssistantName(false)} // Exit edit mode when focus is lost
                    autoFocus
                  />
                ) : (
                  <span onClick={() => setIsEditingAssistantName(true)} className={styles.displayField}>
                    {assistantName || 'Click to edit'}
                  </span>
                )}
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Default Model:</label>
                <input type="text" disabled className={styles.inputField} value={defaultModel} />
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
                  <label className={styles.inputLabel}>Account Status:</label>
                  <input type="text" disabled className={styles.inputField} value={status} readOnly/>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Credit Allotment:</label>
                  <input type="text" disabled className={styles.inputField} value={creditAllotment} readOnly/>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Subscription Plan:</label>
                  <input type="text" disabled className={styles.inputField} value={subscriptionType} readOnly/>
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
