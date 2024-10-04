import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';

interface TokenCounterProps {
  userId: string;
  runId: string | null;
  runCompleted: boolean;
  messagesUpdated: boolean;
}

interface TokenUsage {
  total_tokens: number;
  total_credits: number;
  prompt_tokens_cost: string; // Keep as string if you expect it from the database
  completion_tokens_cost: string; // Keep as string if you expect it from the database
  total_cost: string; // Keep as string if you expect it from the database
}

const TokenCounter: React.FC<TokenCounterProps> = ({ userId, runId, runCompleted }) => {
  const [credits, setCredits] = useState<number | null>(null);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const { fetchUserStatus } = useUser();

  const fetchCurrentCredits = async () => {
    try {
      const response = await fetch(`/api/fetchAndUpdateCredits?userId=${userId}`);
      const data = await response.json();
      console.log('Fetched current credits:', data);
      if (!response.ok) throw new Error('Failed to fetch current credits');
      setCredits(data.currentCredits);
    } catch (error) {
      console.error('Error fetching current credits:', error);
    }
  };

  const fetchTokenUsage = async () => {
    if (!runId) return;
    try {
      const response = await fetch(`/api/tokenCalc?runId=${runId}`);
      const data = await response.json();
      console.log('Fetched token usage:', data);
      if (!response.ok) throw new Error('Failed to fetch token usage');
      setTokenUsage(data.tokenUsage);
      console.log('Token usage set:', data.tokenUsage);
    } catch (error) {
      console.error('Error fetching token usage:', error);
    }
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
      console.log('Update credits response:', response);
      if (!response.ok) throw new Error('Failed to update credits');
    } catch (error) {
      console.error('Error updating credits in the database:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchCurrentCredits();
    }
  }, [userId]);

  useEffect(() => {
    // Only fetch token usage if the run is completed and the runId is available
    if (runId && runCompleted) {
      fetchTokenUsage();
    }
  }, [runId, runCompleted]);

  useEffect(() => {
    if (tokenUsage && runCompleted) {
        const creditsSpent = tokenUsage.total_credits; // Access total_credits correctly

        // Ensure credits is a number and is not null
        if (credits === null) return; // Prevent execution if credits are not ready

        const currentCredits = credits;

        console.log('Current Credits:', currentCredits);
        console.log('Credits Spent:', creditsSpent);

        if (creditsSpent === undefined) {
            console.error('Credits spent is undefined, tokenUsage:', tokenUsage);
            return; // Prevent further execution
        }

        // Calculate new credits
        const newCredits = Math.max(currentCredits - creditsSpent, 0); // Calculate new credits
        console.log('New credits calculated:', newCredits);

        updateCreditsInDatabase(newCredits).then(() => {
          setCredits(newCredits);
        });
    }
  }, [tokenUsage, runCompleted]);

  if (!userId) {
    return null;
  }

  return (
    <div className="font-extrabold text-left">
      <p>Credits: {credits !== null ? credits : "Loading..."}</p>
    </div>
  );
};

export default TokenCounter;
