import React, { useState, useEffect } from 'react';

interface TokenCounterProps {
  userId: string;
}

const TokenCounter: React.FC<TokenCounterProps> = ({ userId }) => {
  const [tokens, setTokens] = useState<number | null>(null);

  const fetchTokens = () => {
    //console.log('Fetching tokens for user:', userId);
    fetch(`/api/fetch-tokens?userId=${userId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        //console.log('Fetched tokens in TokenCounter:', data.tokenCount);
        setTokens(data.tokenCount);
      })
      .catch(error => {
        console.error('Failed to fetch tokens:', error);
        setTokens(null); // Indicate an error state
      });
  };

  useEffect(() => {
    if (userId) {
      fetchTokens();
      const interval = setInterval(fetchTokens, 10000); // Fetch tokens every 60 seconds
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    //console.log('Token state updated:', tokens); // Log the token state
  }, [tokens]);

  return (
    <div className="font-extrabold">
      <p>Tokens:</p>
      {tokens !== null ? (
        <p>{tokens}</p>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default TokenCounter;
