'use client';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import CinetechAssistant from '@/components/cinetech-assistant';
import Sidebar from '@/components/sidebar';
import styles from '@/styles/assistant.module.css';
import { generatePdfWithSelectedMessages } from '@/utils/generateShotSheet';
import TokenCounter from '@/components/token-counter';

interface Message {
  id: string;
  role: string;
  content: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [screenOrientation, setScreenOrientation] = useState<string>("portrait");
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);
  const [imageLibrary, setImageLibrary] = useState<{ imageUrl: string; thumbnailUrl: string }[]>([]);
  const [messagesLibrary, setMessagesLibrary] = useState<{ content: string; thumbnailUrl: string }[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [fetchTokenTrigger, setFetchTokenTrigger] = useState(false);

  const userId = session?.user?.id || ''; // Ensure userId is available

  const updateTokensInDatabase = async (userId: string, newTokenCount: number) => {
    try {
      console.log(`Updating tokens in database for user: ${userId} with new token count: ${newTokenCount}`);
      const response = await fetch('/api/fetch-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, tokensUsed: newTokenCount }),
      });
      const result = await response.json();
      if (response.ok) {
        console.log('Token count updated successfully:', result);
        // Trigger token fetch update
        setFetchTokenTrigger(prev => !prev);
      } else {
        console.error('Failed to update token count:', result.message);
      }
    } catch (error) {
      console.error('Error updating token count:', error);
    }
  };

  const addToImageLibrary = (imageUrl: string) => {
    setImageLibrary((prevLibrary) => [
      ...prevLibrary,
      { imageUrl, thumbnailUrl: `/path/to/thumbnail/${prevLibrary.length + 1}` }, // Example thumbnailUrl
    ]);
  };
  
  const handleCancelRun = async () => {
    if (!threadId || !runId) {
      console.error('Thread ID or Run ID is missing');
      return;
    }

    try {
      const response = await fetch('/api/cancel-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threadId, runId }), // Include threadId and runId
      });
      const result = await response.json();
      if (result.success) {
        console.log('Run cancelled successfully');
      } else {
        console.error('Failed to cancel run:', result.error);
      }
    } catch (error) {
      console.error('Error cancelling run:', error);
    }
  };

  const handleGeneratePdfClick = async () => {
    console.log('Selected Messages:', selectedMessages);
    if (selectedMessages.length === 2) {
      const [breakdownMessage, imageMessage] = selectedMessages;
      await generatePdfWithSelectedMessages([breakdownMessage, imageMessage]);
    } else {
      alert("Please select one breakdown message and one image message.");
    } 
    setSelectedMessages([]); // Clear the selected messages
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        generatePdf={handleGeneratePdfClick}
        userId={userId} // Pass the user ID to Sidebar
      />
      <div className="flex-1 flex flex-col ml-0 md:ml-64">
        <header className={styles.header}>
          <div className={styles.leftSection}>
            <button onClick={handleCancelRun} className={styles.cancelButton}>Cancel Run</button>
          </div>
          <div className={styles.rightSection}>
            <TokenCounter userId={userId} fetchTokenTrigger={fetchTokenTrigger} />
          </div>
        </header>
        <main className={styles.main}>
          <CinetechAssistant
            assistantId="asst_fmjzsttDthGzzJud4Vv2bDGq"
            greeting="Hey there! How can I help?"
            setSelectedMessages={setSelectedMessages}
            selectedMessages={selectedMessages}
            setThreadId={setThreadId}
            setRunId={setRunId}
          />
        </main>
      </div>
    </div>
  );
}