import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AiFillQuestionCircle } from 'react-icons/ai';
import styles from '@/styles/sidebar.module.css';
import { useWorkspace, WorkspaceDetails } from '@/context/WorkspaceContext';
import { useUser } from '@/context/UserContext';
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
  const { handleStartUsingApp } = useUser();
  const [ showTokenCounter, setShowTokenCounter ] = useState(false);
  const router = useRouter();

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const toggleWorkspaceExpand = () => {
    setIsWorkspaceExpanded(!isWorkspaceExpanded);
  };

  const toggleLibrary = (library: string) => {
    //handleStartUsingApp();
    setActiveLibrary(activeLibrary === library ? null : library);
  };

  const loadSavedThread = async (newThreadId: string) => {
    const messagesAdded = sessionStorage.getItem('messagesAdded') === 'true';
    const existingThreadId = sessionStorage.getItem('threadId');
    handleStartUsingApp();

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
    // Create a Date object from the UTC timestamp
    const utcDate = new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(utcDate.getTime())) {
      return 'Invalid date'; // Handle invalid date
    }
  
    // Convert the UTC date to local time
    const localDate = new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
  
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  
    // Compare the local date with the start of today and yesterday
    if (localDate >= startOfToday) {
      return 'Today';
    } else if (localDate >= startOfYesterday && localDate < startOfToday) {
      return 'Yesterday';
    } else {
      return localDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };
  
  const groupThreadsByDate = (threads: Thread[]): { [key: string]: Thread[] } => {
    const groupedThreads: { [key: string]: Thread[] } = {};
  
    // Sort threads by last_active date before grouping
    const sortedThreads = threads.sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime());
  
    sortedThreads.forEach((thread) => {
      const lastActiveDate = new Date(thread.last_active);
      const now = new Date();
      const diffInTime = now.getTime() - lastActiveDate.getTime();
      const diffInDays = Math.ceil(diffInTime / (1000 * 60 * 60 * 24));
  
      let key;
      if (diffInDays === 0) {
        key = 'Today';
      } else if (diffInDays === 1) {
        key = 'Yesterday';
      } else if (diffInDays <= 5) {
        key = `${diffInDays} days ago`;
      } else {
        key = lastActiveDate.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
  
      if (!groupedThreads[key]) {
        groupedThreads[key] = [];
      }
      groupedThreads[key].push(thread);
    });
  
    return groupedThreads;
  };
  
  const groupedThreads = groupThreadsByDate(threads);

  const handleFaqClick = () => {
    router.push('/faq');
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
              {Object.keys(groupedThreads).map((key) => (
                <div key={key}>
                  {/* Render the group heading only once */}
                  <span className={styles.boldTimestamp}>{key}</span>
                  {groupedThreads[key].map((thread: Thread) => {
                    // Sort and prepare keywords and topics
                    const sortedKeywords = (thread.keywords as unknown as KeywordType[])
                      .sort((a: KeywordType, b: KeywordType) => parseFloat(b.weight) - parseFloat(a.weight))
                      .slice(0, 3) // Top 3 keywords
                      .map((keywordObj: KeywordType) => keywordObj.keyword);
                  
                    const sortedTopics = (thread.topics as unknown as TopicType[])
                      .sort((a: TopicType, b: TopicType) => parseFloat(b.weight) - parseFloat(a.weight))
                      .slice(0, 3) // Top 3 topics
                      .map((topicObj: TopicType) => topicObj.topic);
                  
                    const hasSynopsis = thread.summary && thread.keywords && thread.topics;
                  
                    return (
                      <li key={thread.id} className={styles.threadListItem}>
                        {/* Remove individual thread timestamp to avoid duplication */}
                        <button className={styles.textLine} onClick={() => handleThreadClick(thread)}>
                          {hasSynopsis ? (
                            <>
                              <div>
                                <strong className={styles.boldText}>Topics covered:</strong> {sortedTopics.join(', ')}
                              </div>
                              <div>
                                <strong className={styles.boldTextKeywords}>Keywords:</strong> {sortedKeywords.join(', ')}
                              </div>
                            </>
                          ) : (
                            <div>{thread.title || 'No synopsis available yet'}</div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </div>
              ))}
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
          <div className={styles.buttonContainer}>
            <button className={styles.helpButton} onClick={handleFaqClick}>
              <AiFillQuestionCircle className={styles.helpIcon} />
              Help
            </button>
            <button className={styles.supportButton}>
              Support
            </button>
          </div>
          {showTokenCounter && (
            <TokenCounter
              userId={userId}
              runId={runId}
              runCompleted={runCompleted}
              messagesUpdated={messagesUpdated}
            />
          )}
        </div>
      </div>
    </>
  );  
};

export default Sidebar;
