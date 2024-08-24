import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/sidebar.module.css';
import { useRouter } from 'next/navigation';
import Workspace from '@/components/workspace';
import TokenCounter from '@/components/token-counter';
import { useThreads } from '@/context/ThreadsContext';

// Define the type for a thread
interface Thread {
  id: string;
  title: string;
}

interface SidebarProps {
  userId: string;
  runId: string;
  runCompleted: boolean;
  messagesUpdated: boolean;
  onSelectThread: (threadId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ userId, runId, runCompleted, messagesUpdated, onSelectThread }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(false);

  const { threads, fetchThreads } = useThreads();
  const router = useRouter();

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const toggleWorkspaceExpand = () => {
    setIsWorkspaceExpanded(!isWorkspaceExpanded);
  };

  const handleThreadClick = (threadId: string) => {
    console.log('Clicked thread ID:', threadId);
    onSelectThread(threadId);
  };

  useEffect(() => {
    console.log('Sidebar threads:', threads);  // Add this to debug
  }, [threads]);  

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarVisible(true);
      } else {
        setIsSidebarVisible(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch threads when userId is available
  useEffect(() => {
    if (userId) {
      fetchThreads(userId);
    }
  }, [userId, fetchThreads]);

  return (
    <>
      <button className={styles.hamburger} onClick={toggleSidebar}>
        ☰
      </button>
      <div className={`${styles.sidebar} ${isSidebarVisible ? styles.visible : ''}`}>
        <div className={styles.topSection}>
          <Link href="/">
            <Image
              src="/cinetech_art.png"
              alt="Cinetech Logo"
              width="250"
              height="250"
              className={styles.cinetechArtImage} /* Apply the new class here */
            />
          </Link>
        </div>
        <div className={styles.middleSection}>
          <div className={styles.buttonsContainer}>
            <button
              className="mt-4 w-full bg-opacity-100 hover:bg-gray-700 text-left text-white font-bold py-2 px-4 rounded"
              onClick={toggleWorkspaceExpand}
            >
              Workspaces
            </button>
            {isWorkspaceExpanded && (
              <div className={styles.expandedSection}>
                <Workspace userId={userId} />
              </div>
            )}
          </div>
          <div className={styles.threadListSection}>
            <h3 className="text-white font-bold text-left">Conversations</h3>
            <ul className={styles.threadList}>
              {threads.map((thread: Thread) => (
                <li key={thread.id} className={styles.threadListItem}>
                  <button
                    onClick={() => handleThreadClick(thread.id)}
                    className={`${styles.textLine}`}
                  >
                    {thread.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className={styles.bottomSection}>
          <div className={styles.tokenCounter}>
            <TokenCounter userId={userId} runId={runId} runCompleted={runCompleted} messagesUpdated={messagesUpdated} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
