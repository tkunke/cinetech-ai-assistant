import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/sidebar.module.css';
import WorkspaceManager from '@/components/WorkspaceManager';
import TokenCounter from '@/components/token-counter';
import { useThreads } from '@/context/ThreadsContext';

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
  const { data: session } = useSession();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(false);
  const [activeLibrary, setActiveLibrary] = useState<string | null>(null);

  const { threads, fetchThreads } = useThreads();

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const toggleWorkspaceExpand = () => {
    setIsWorkspaceExpanded(!isWorkspaceExpanded);
  };

  const toggleLibrary = (library: string) => {
    setActiveLibrary(activeLibrary === library ? null : library);
  };

  const handleThreadClick = (threadId: string) => {
    console.log('Clicked thread ID:', threadId);
    onSelectThread(threadId);
    sessionStorage.setItem('threadId', threadId);
  };

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
        {/* Top Section: Logo */}
        <div className={styles.topSection}>
          <Link href="/">
            <Image
              src="/cinetech_art.png"
              alt="Cinetech Logo"
              width="150"
              height="150"
              className={styles.cinetechArtImage}
            />
          </Link>
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
              {threads.map((thread: Thread) => (
                <li key={thread.id} className={styles.threadListItem}>
                  <button
                    onClick={() => handleThreadClick(thread.id)}
                    className={styles.textLine}
                  >
                    {thread.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
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
