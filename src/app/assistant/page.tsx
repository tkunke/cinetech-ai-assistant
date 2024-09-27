'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import CinetechAssistant from '@/components/cinetech-assistant';
import { useThreads } from '@/context/ThreadsContext';
import styles from '@/styles/assistant.module.css';
import { generatePdfWithSelectedMessages } from '@/utils/generateShotSheet';
import { FaUserCircle, FaRocketchat } from 'react-icons/fa';

interface Message {
  id: string;
  role: string;
  content: string;
}

function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [assistantId, setAssistantId] = useState('');
  
  useEffect(() => {
    console.log('Session data:', session);
  }, [session]);

  const [screenOrientation, setScreenOrientation] = useState<string>("portrait");
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);
  const [isCreativeToolsExpanded, setIsCreativeToolsExpanded] = useState(false);
  const [isUserMenuExpanded, setIsUserMenuExpanded] = useState(false);
  const resetMessagesRef = useRef<(() => void) | null>(null);
  const { updateThread } = useThreads();

  const userId = session?.user?.id ? String(session.user.id) : ''; // Ensure userId is available

  let threadId = '';

  if (typeof window !== 'undefined') {
    threadId = sessionStorage.getItem('threadId') || '';
  }

  // Load assistantId from session storage or URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const queryParams = new URLSearchParams(window.location.search);
      const assistantIdFromUrl = queryParams.get('assistantId');
      const assistantIdFromSession = sessionStorage.getItem('assistantId');
  
      if (assistantIdFromUrl) {
        setAssistantId(assistantIdFromUrl);
      } else if (assistantIdFromSession) {
        setAssistantId(assistantIdFromSession);
      } else {
        console.error('No assistant ID found');
      }
    }
  }, [session]);

  const toggleCreativeToolsExpand = () => {
    setIsCreativeToolsExpanded(!isCreativeToolsExpanded);
  };

  const toggleUserMenuExpand = () => {
    setIsUserMenuExpanded(!isUserMenuExpanded);
  };

  const handleGeneratePdfClick = async () => {
    if (selectedMessages.length >= 2) {
      await generatePdfWithSelectedMessages(selectedMessages);
    } else {
      alert("Please select one breakdown message and at least one image message.");
    }
    setSelectedMessages([]); // Clear the selected messages
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    signOut({ callbackUrl: '/logout' });
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  const handleCreditAdd = () => {
    router.push('/purchasecredits');
  };

  const handleMouseLeave = () => {
    setIsCreativeToolsExpanded(false);
    setIsUserMenuExpanded(false);
  };

  const handleStartNewThreadClick = async () => {
    const messagesAdded = sessionStorage.getItem('messagesAdded') === 'true';
    const existingThreadId = sessionStorage.getItem('threadId');

    if (messagesAdded && existingThreadId) {
        updateThread(existingThreadId, userId);
        sessionStorage.removeItem('messagesAdded'); // Reset the flag
    }

    sessionStorage.clear();

    if (resetMessagesRef.current) {
        resetMessagesRef.current(); // Call the reset function stored in the ref
    }
  };

  const handleGenerateSynopsisClick = async () => {
    const savedThreadId = sessionStorage.getItem('threadId');

    if (savedThreadId) {
        try {
            // Call the API to generate the synopsis
            const response = await fetch(`/api/generateThreadSynopsis?threadId=${savedThreadId}`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Failed to generate synopsis');
            }

            const data = await response.json();
            const synopsis = data.synopsis;

            console.log('Generated Synopsis:', synopsis);

            if (synopsis) {
                // No need to parse the synopsis as it's already an object
                const parsedSynopsis = synopsis;

                // Extract topics, keywords, and summary
                const topics = parsedSynopsis.topics || {};
                const keywords = parsedSynopsis.keywords || {};
                const summary = parsedSynopsis.summary || {};

                console.log('Topics:', topics);
                console.log('Keywords:', keywords);
                console.log('Summary:', summary);

                // Post the topics, keywords, and summary to the database
                const saveResponse = await fetch('/api/saveAnalysis', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        threadId: savedThreadId,
                        topics,
                        keywords,
                        summary,
                    }),
                });

                if (saveResponse.ok) {
                    console.log('Analysis saved successfully');
                } else {
                    throw new Error('Failed to save analysis');
                }

            } else {
                alert("Failed to generate synopsis.");
            }
        } catch (error: any) {
            console.error("Error:", error);
            alert(error.message || "An error occurred.");
        }
    } else {
        alert("No active thread found.");
    }
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col ml-0 md:ml-80">
        <header className={styles.header}>
          <div className={styles.leftSection}>
            <button className={styles.chatButton} onClick={handleStartNewThreadClick}>
              <FaRocketchat title="Start New Conversation" />
            </button>
            <div
              className={`${styles.creativeToolsContainer} ${isCreativeToolsExpanded ? 'active' : ''}`}
              onMouseLeave={handleMouseLeave}
            >
              <button onClick={toggleCreativeToolsExpand} className={`${styles.creativeToolsButton} creativeToolsButton`}>
                Creative Tools
              </button>
              {isCreativeToolsExpanded && (
                <ul className={`${styles.creativeToolsDropdown} creativeToolsDropdown`}>
                  <li onClick={handleGeneratePdfClick} className={styles.creativeToolsButton}>
                    Generate Shot Sheet
                  </li>
                </ul>
              )}
            </div>
            {/*<button onClick={handleGenerateSynopsisClick} style={{ display: 'block' }}>
              Generate Synopsis
            </button>*/}
          </div>
          <div className={styles.middleSection}></div>
          <div
            className={`${styles.userIconContainer} ${isUserMenuExpanded ? 'active' : ''}`}
            onMouseLeave={handleMouseLeave}
          >
            <FaUserCircle className={styles.userIcon} onClick={toggleUserMenuExpand} />
            {isUserMenuExpanded && (
              <ul className={styles.userDropdown} style={{ display: 'block' }}>
                <li onClick={handleProfileClick} className={styles.userMenuItem}>Profile</li>
                <li onClick={handleLogout} className={styles.userMenuItem}>Logout</li>
                <li onClick={handleCreditAdd} className={styles.userMenuItem}>Add Credits</li>
              </ul>
            )}
          </div>
        </header>
        <main className={styles.main}>
          <CinetechAssistant
            assistantId={assistantId}
            setSelectedMessages={setSelectedMessages}
            selectedMessages={selectedMessages}
            resetMessagesRef={resetMessagesRef}
          />
        </main>
      </div>
    </div>
  );
}

// Wrapping the Home component with dynamic import
export default dynamic(() => Promise.resolve(Home), { ssr: false });
