import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/sidebar.module.css';
import { useWorkspace, WorkspaceDetails } from '@/context/WorkspaceContext';
import WorkspaceManager from '@/components/WorkspaceManager';
import TokenCounter from '@/components/token-counter';
import MessagePopup from '@/components/MessagePopup';
import { useThreads } from '@/context/ThreadsContext';
import { Thread } from '@/context/ThreadsContext';

interface SidebarProps {
  userId: string;
  runId: string;
  runCompleted: boolean;
  messagesUpdated: boolean;
  onSelectThread: (threadId: string) => void;
}

type KeywordType = {
  keyword: string;
  weight: string;
};

type TopicType = {
  topic: string;
  weight: string;
};

const Sidebar: React.FC<SidebarProps> = ({ userId, runId, runCompleted, messagesUpdated, onSelectThread }) => {
  const { data: session } = useSession();
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(window.innerWidth > 768);
  const { workspaces, activeWorkspaceId } = useWorkspace();
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(false);
  const [activeLibrary, setActiveLibrary] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const { threads, fetchThreads, updateThread } = useThreads();

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const toggleWorkspaceExpand = () => {
    setIsWorkspaceExpanded(!isWorkspaceExpanded);
  };

  const toggleLibrary = (library: string) => {
    setActiveLibrary(activeLibrary === library ? null : library);
  };

  const loadSavedThread = async (newThreadId: string) => {
    const messagesAdded = sessionStorage.getItem('messagesAdded') === 'true';
    const existingThreadId = sessionStorage.getItem('threadId');

    if (messagesAdded && existingThreadId) {
        // Call updateThread with the existing threadId before switching to a new one
        updateThread(existingThreadId, userId);
        sessionStorage.removeItem('messagesAdded'); // Reset the flag
    }

    // Proceed with the thread switch
    console.log('Clicked thread ID:', newThreadId);
    onSelectThread(newThreadId);
    sessionStorage.setItem('threadId', newThreadId);
  };

  const handleThreadClick = (thread: Thread) => {
    try {
      const description = thread.summary || 'No synopsis available';
      const topics = thread.topics || [];
      const keywords = thread.keywords || [];
  
      setCurrentThread({
        ...thread,
        summary: description,
        // @ts-ignore: Suppressing TypeScript warning for the map function
        topics: topics.map((t: { topic: string, weight: string }) => `${t.topic} (${t.weight})`).join(', '),
        // @ts-ignore: Suppressing TypeScript warning for the map function
        keywords: keywords.map((k: { keyword: string, weight: string }) => `${k.keyword} (${k.weight})`).join(', '),
      });
    } catch (error) {
      console.error('Error handling thread data:', error);
      setCurrentThread({
        ...thread,
        summary: 'Failed to load synopsis',
      });
    }
  
    setShowPopup(true);
  };            
  

  useEffect(() => {
    if (userId) {
      fetchThreads(userId);
    }

    const handleResize = () => {
      setIsSidebarVisible(window.innerWidth > 768); // Show sidebar if the screen is larger than 768px
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [userId, fetchThreads]);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
  
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date'; // Handle invalid date
    }
  
    // Get the difference in time (in milliseconds)
    const diffInTime = now.getTime() - date.getTime();
  
    // Calculate the difference in days, rounding up to avoid negative days
    const diffInDays = Math.ceil(diffInTime / (1000 * 60 * 60 * 24));
  
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays <= 5) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };    
  
  return (
    <>
      <button className={styles.hamburger} onClick={toggleSidebar}>
        ☰
      </button>
      <div className={`${styles.sidebar} ${isSidebarVisible ? styles.visible : ''}`}>
        {/* Top Section: Logo & Active Workspace */}
        <div className={styles.topSection}>
          <Link href="/">
            <Image
              src="/bw_logo.png"
              alt="Cinetech Logo"
              width="150"
              height="150"
              className={styles.cinetechArtImage}
            />
          </Link>
          {activeWorkspaceId && (
            <div className={styles.activeWorkspaceDisplay}>
              {workspaces.find((ws) => ws.id === activeWorkspaceId)?.name === 'My Workspace'
                ? `Active: ${session?.user?.first_name || 'My'}'s Workspace`
                : `Active: ${workspaces.find((ws) => ws.id === activeWorkspaceId)?.name}`}
            </div>
          )}
        </div>
  
        {/* Middle Section: Workspaces and Content Libraries */}
        <div className={styles.middleSection}>
          <div className={styles.workspaceManagerContainer}>
            <WorkspaceManager
              userId={userId}
              activeLibrary={activeLibrary}
              toggleLibrary={toggleLibrary}
            />
          </div>
          <div className={styles.threadListSection}>
            <h3 className={styles.sectionTitle}>Conversations</h3>
            <ul className={styles.threadList}>
            {threads.map((thread: Thread) => {
              const sortedKeywords = (thread.keywords as unknown as KeywordType[])
                .sort((a: KeywordType, b: KeywordType) => parseFloat(b.weight) - parseFloat(a.weight))
                .slice(0, 3) // Top 3 keywords
                .map((keywordObj: KeywordType) => keywordObj.keyword); // Extract the keyword field
                        
              const sortedTopics = (thread.topics as unknown as TopicType[])
                .sort((a: TopicType, b: TopicType) => parseFloat(b.weight) - parseFloat(a.weight))
                .slice(0, 3) // Top 3 topics
                .map((topicObj: TopicType) => topicObj.topic); // Extract the topic field

              const hasSynopsis = thread.summary && thread.keywords && thread.topics;

              const displayText = hasSynopsis ? (
                <>
                  <div>
                    <strong>Topics covered:</strong> {sortedTopics.join(', ')}
                  </div>
                  <div>
                    <strong>Keywords:</strong> {sortedKeywords.join(', ')}
                  </div>
                </>
              ) : (
                <div>{thread.title || 'No synopsis available yet'}</div>
              );
                        
              return (
                <li key={thread.id} className={styles.threadListItem}>
                  <div className={styles.threadTimestamp}>
                    {formatTimestamp(thread.last_active)} {/* This renders the formatted date */}
                  </div>
                  <button className={styles.textLine} onClick={() => handleThreadClick(thread)}>
                    {displayText}
                  </button>
                </li>
              );
            })}
            </ul>
          </div>
        </div>
  
        {/* Popup for displaying thread summary */}
        {showPopup && currentThread && (
          <MessagePopup
            title="Conversation Synopsis:"
            content={currentThread.summary || 'No summary available'}
            timestamp={
              currentThread.last_active
                ? formatTimestamp(currentThread.last_active)  // Apply the formatting here
                : 'No date available'
            }
            onClose={() => setShowPopup(false)}
            threadId={currentThread.id}
            onLoadThread={loadSavedThread}
          />
        )}
  
        {/* Bottom Section: Conversations and Token Counter */}
        <div className={styles.bottomSection}>
          <TokenCounter
            userId={userId}
            runId={runId}
            runCompleted={runCompleted}
            messagesUpdated={messagesUpdated}
          />
        </div>
      </div>
    </>
  );  
};

export default Sidebar;
