import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/sidebar.module.css';
import { useRouter } from 'next/navigation';
import Workspace from '@/components/workspace';
import TokenCounter from '@/components/token-counter';

interface SidebarProps {
  generatePdf: () => void;
  userId: string;
  runId: string;
  runCompleted: boolean;
  messagesUpdated: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ userId, runId, runCompleted, messagesUpdated }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(false);

  const router = useRouter();

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const toggleWorkspaceExpand = () => {
    setIsWorkspaceExpanded(!isWorkspaceExpanded);
  };

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

  return (
    <>
      <button className={styles.hamburger} onClick={toggleSidebar}>
        ☰
      </button>
      <div className={`${styles.sidebar} ${isSidebarVisible ? styles.visible : ''}`}>
        <div className={styles.topSection}>
          <Link href="/">
            <Image src="/cinetech_art.png" alt="Cinetech Logo" width="200" height="200" />
          </Link>
        </div>
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
        <div className={styles.bottomSection}>
          <TokenCounter userId={userId} runId={runId} runCompleted={runCompleted} messagesUpdated={messagesUpdated}/>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
