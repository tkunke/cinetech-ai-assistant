console.log('TokenCounter component has mounted');

import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';

interface TokenCounterProps {
  userId: string;
  runId: string | null;
  runCompleted: boolean;
  messagesUpdated: boolean;
}

const TokenCounter: React.FC<TokenCounterProps> = ({ userId, runId, runCompleted, messagesUpdated }) => {
  const [credits, setCredits] = useState<number | null>(null);
  const [localRunId, setLocalRunId] = useState<string | null>(null); // Local state to preserve runId
  const { fetchUserStatus } = useUser();

  useEffect(() => {
    if (runId) {
      setLocalRunId(runId); // Set localRunId when runId is provided
    }
  }, [runId]);

  //console.log('token-counter has this for localRunId:', localRunId);

  const fetchCurrentCredits = async () => {
    try {
      const response = await fetch(`/api/fetchAndUpdateCredits?userId=${userId}`);
      const data = await response.json();
      console.log('Fetched current credits:', data); // <-- Add this for debugging
      if (!response.ok) throw new Error('Failed to fetch current credits');
      setCredits(data.tokenCount);
      console.log('Credits set to:', data.tokenCount);
    } catch (error) {
      console.error('Error fetching current credits:', error);
    }
  };  

  const handleCreditUpdate = async () => {
    if (!localRunId) return;
  
    let attempt = 0;
    const maxAttempts = 15;
    const pollInterval = 3000;
  
    const pollCredits = async () => {
      attempt++;
      try {
        const response = await fetch(`/api/tokenCalc?runId=${localRunId}`);
        const data = await response.json();
        console.log('TokenCalc API response:', data); // <-- Add this for debugging
        if (response.ok) {
          const creditsSpent = data.credits;
          if (credits !== null && creditsSpent !== null) {
            const newCredits = credits - creditsSpent;
            console.log('Updating credits:', newCredits); // <-- Add this for debugging
            await updateCreditsInDatabase(newCredits);
            fetchCurrentCredits(); // <-- Ensure this is called to fetch the updated credits
            return;
          }
        }
        if (attempt < maxAttempts) {
          setTimeout(pollCredits, pollInterval);
        } else {
          console.error('Failed to retrieve credits after multiple attempts');
        }
      } catch (error) {
        console.error('Error polling token cost:', error);
        if (attempt < maxAttempts) {
          setTimeout(pollCredits, pollInterval);
        }
      }
    };
  
    setTimeout(pollCredits, 5000);
  };  

  const updateCreditsInDatabase = async (newCredits: number) => {
    try {
      const response = await fetch('/api/fetchAndUpdateCredits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, newCredits }),
      });
      if (!response.ok) throw new Error('Failed to update credits');
    } catch (error) {
      console.error('Error updating credits in the database:', error);
    }
  };

  useEffect(() => {
    console.log('User ID in TokenCounter:', userId); // Log userId on mount
    if (userId) {
      console.log('User ID available, fetching current credits for user:', userId);
      fetchCurrentCredits();
    }
  }, [userId]);    

  useEffect(() => {
    if (userId && localRunId && runCompleted && messagesUpdated) {
      handleCreditUpdate();
    }
  }, [userId, localRunId, runCompleted, messagesUpdated]);

  useEffect(() => {
    if (credits !== null && runCompleted && typeof fetchUserStatus === 'function') {
      fetchUserStatus(userId); // Fetch user status after updating credits
    }
  }, [credits, runCompleted, fetchUserStatus]);

  if (!userId) {
    console.log('User ID not available yet, not rendering TokenCounter.');
    return null;  // Don't render anything if userId is not available yet
  }

  return (
    <div className="font-extrabold text-left">
      <p>Credits: {credits !== null ? credits : "Loading..."}</p>
    </div>
  );
};

export default TokenCounter;
