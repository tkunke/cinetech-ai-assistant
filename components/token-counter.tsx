import React, { useState, useEffect } from 'react';

interface TokenCounterProps {
  userId: string;
  runId: string | null;
  runCompleted: boolean;
  messagesUpdated: boolean;
}

const TokenCounter: React.FC<TokenCounterProps> = ({ userId, runId, runCompleted, messagesUpdated }) => {
  const [credits, setCredits] = useState<number | null>(null);

  const fetchCurrentCredits = async () => {
    try {
      const response = await fetch(`/api/fetchAndUpdateCredits?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch current credits');
      const data = await response.json();
      setCredits(data.tokenCount);
    } catch (error) {
      console.error('Error fetching current credits:', error);
    }
  };

  const handleCreditUpdate = async () => {
    if (!runId) return;

    let attempt = 0;
    const maxAttempts = 15; // Increased number of attempts
    const pollInterval = 3000; // 3 seconds delay

    const pollCredits = async () => {
      attempt++;
      try {
        const response = await fetch(`/api/tokenCalc?runId=${runId}`);
        if (response.ok) {
          const data = await response.json();
          const creditsSpent = data.credits;

          if (credits !== null && creditsSpent !== null) {
            const newCredits = credits - creditsSpent;
            await updateCreditsInDatabase(newCredits);
            fetchCurrentCredits();
            return; // Stop polling if successful
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

    setTimeout(pollCredits, 5000); // Initial delay of 5 seconds before polling starts
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
    if (userId) fetchCurrentCredits();
  }, [userId]);

  useEffect(() => {
    if (userId && runId && runCompleted && messagesUpdated) {
      handleCreditUpdate();
    }
  }, [userId, runId, runCompleted, messagesUpdated]);

  return (
    <div className="font-extrabold text-left">
      <p>Credits: {credits !== null ? credits : "Loading..."}</p>
    </div>
  );
};

export default TokenCounter;
