"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from '@/styles/profile.module.css';

const UserProfileSettings = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [assistantName, setAssistantName] = useState('chatgpt-4o'); // Default value
  const [verbosityLevel, setVerbosityLevel] = useState(2); // Default to Medium
  const [accountStatus, setAccountStatus] = useState('');
  const [subscriptionType, setSubscriptionType] = useState('');
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [creditAllotment, setCreditAllotment] = useState(0);
  const [activePanel, setActivePanel] = useState('profile'); // Default to profile settings

  const router = useRouter();

  useEffect(() => {
    // Simulated fetching of user data
    const fetchProfileData = async () => {
      if (!userId) return; // Only fetch if userId is defined

      const response = await fetch(`/api/getProfileData?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        setUsername(data.user.username);
        setEmail(data.user.email);
        setAssistantName(data.user.assistantName || 'chatgpt-4o');
        setAccountStatus(data.user.accountStatus);
        setSubscriptionType(data.user.planType);
        setCreditsBalance(data.user.creditsBalance);
        setCreditAllotment(data.user.creditAllotment);
      }
    };

    fetchProfileData(); // Fetch when userId is available
  }, [userId]);

  const handlePasswordReset = async () => {
    const response = await fetch('/api/resetPassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      alert('Password reset email has been sent.');
    } else {
      alert('Failed to send reset email.');
    }
  };

  const fetchCredits = async (userId: string) => {
    try {
      const response = await fetch(`/api/fetchAndUpdateCredits?userId=${userId}`, {
        method: 'GET',
      });
      const data = await response.json();
      if (response.ok) {
        console.log('Current Credits:', data.currentCredits);
        return data.currentCredits;
      } else {
        throw new Error(data.error || 'Failed to fetch credits');
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      return null;
    }
  };
  
  // When the user selects "Account Settings"
  useEffect(() => {
    if (activePanel === 'account' && userId) {
      fetchCredits(userId).then((credits) => {
        setCreditsBalance(credits);
      });
    }
  }, [activePanel, userId]);  

  const renderPanel = () => {
    switch (activePanel) {
      case 'profile':
        return (
          <div className={styles.panel}>
            <h3>Profile Settings</h3>
            <div className={styles.infoItem}>
              <span>Username:</span>
              <input type="text" value={username} readOnly />
            </div>
            <div className={styles.infoItem}>
              <span>Email:</span>
              <input type="text" value={email} readOnly />
            </div>
            <button className={styles.resetButton} onClick={handlePasswordReset}>
              Reset Password
            </button>
          </div>
        );
      case 'assistant':
        return (
          <div className={styles.panel}>
            <h3>Assistant Settings</h3>
            <div className={styles.infoItem}>
              <span>Assistant Name:</span>
              <input
                type="text"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
              />
            </div>
            <div className={styles.infoItem}>
              <span>Default Model:</span>
              <input type="text" value="chatgpt-4o" readOnly />
            </div>
            <div className={styles.infoItem}>
              <span>Verbosity Level:</span>
              <input
                type="range"
                min="1"
                max="3"
                value={verbosityLevel}
                onChange={(e) => setVerbosityLevel(Number(e.target.value))}
              />
              <span>{verbosityLevel === 1 ? 'Low' : verbosityLevel === 2 ? 'Medium' : 'High'}</span>
            </div>
          </div>
        );
      case 'account':
        return (
          <div className={styles.panel}>
            <h3>Account Settings</h3>
            <div className={styles.infoItem}>
              <span>Account Status:</span>
              <input type="text" value={accountStatus} readOnly />
            </div>
            <div className={styles.infoItem}>
              <span>Subscription Plan:</span>
              <input type="text" value={subscriptionType} readOnly />
            </div>
            <div className={styles.infoItem}>
              <span>Current Credits Balance:</span>
              <input type="text" value={creditsBalance} readOnly />
            </div>
            <div className={styles.infoItem}>
              <span>Credit Allotment:</span>
              <input type="text" value={creditAllotment} readOnly />
            </div>
            <button className={styles.cancelMembershipButton} onClick={() => alert('Cancel membership')}>
              Cancel Membership
            </button>
          </div>
        );
      case 'notifications':
        return <div className={styles.panel}><h3>Notifications Settings</h3></div>;
      default:
        return null;
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.sidebar}>
        <h2>Settings</h2>
        <ul>
          <li onClick={() => setActivePanel('profile')}>Profile Settings</li>
          <li onClick={() => setActivePanel('assistant')}>Assistant Settings</li>
          <li onClick={() => setActivePanel('account')}>Account Settings</li>
          <li onClick={() => setActivePanel('notifications')}>Notifications</li>
        </ul>
      </div>
      <div className={styles.content}>
        {renderPanel()}
      </div>
    </div>
  );
};

export default UserProfileSettings;
