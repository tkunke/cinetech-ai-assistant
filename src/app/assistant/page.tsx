'use client';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import CinetechAssistant from '@/components/cinetech-assistant';
import Sidebar from '@/components/sidebar';
import styles from '@/styles/assistant.module.css';
import { generatePdfWithSelectedMessages } from '@/utils/generateShotSheet';


interface Message {
  id: string;
  role: string;
  content: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  
  useEffect(() => {
    console.log('Session data:', session);
  }, [session]);

  const [screenOrientation, setScreenOrientation] = useState<string>("portrait");
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isCreativeToolsExpanded, setIsCreativeToolsExpanded] = useState(false);

  const userId = session?.user?.id ? String(session.user.id) : ''; // Ensure userId is available

  const toggleCreativeToolsExpand = () => {
    setIsCreativeToolsExpanded(!isCreativeToolsExpanded);
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
    if (selectedMessages.length >= 2) {
      await generatePdfWithSelectedMessages(selectedMessages);
    } else {
      alert("Please select one breakdown message and at least one image message.");
    }
    setSelectedMessages([]); // Clear the selected messages
  };  

  const handleLogout = () => {
    signOut({
      callbackUrl: '/logout',
    });
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        generatePdf={handleGeneratePdfClick}
        userId={userId} // Pass the user ID to Sidebar
      />
      <div className="flex-1 flex flex-col ml-0 md:ml-80">
        <header className={styles.header}>
          <div className={styles.leftSection}>
            <button onClick={handleCancelRun} className={styles.cancelButton}>Cancel Run</button>
          </div>
          <div className={styles.middleSection}>
            <div className={styles.creativeToolsContainer}>
              <button onClick={toggleCreativeToolsExpand} className={`${styles.creativeToolsButton} creativeToolsButton`}>
                Creative Tools
              </button>
              {isCreativeToolsExpanded && (
                <ul className={`${styles.creativeToolsDropdown} creativeToolsDropdown`}>
                  <li onClick={handleGeneratePdfClick} className={styles.creativeToolsButton}>Generate Shot Sheet</li>
                  {/* Add more buttons or links here as needed */}
                </ul>
              )}
            </div>
          </div>
          <div className={styles.rightSection}>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </div>
        </header>
        <main className={styles.main}>
          <CinetechAssistant
            assistantId="asst_fmjzsttDthGzzJud4Vv2bDGq"
            greeting="Loading..."
            setSelectedMessages={setSelectedMessages}
            selectedMessages={selectedMessages}
            setThreadId={setThreadId}
          />
        </main>
      </div>
    </div>
  );
}