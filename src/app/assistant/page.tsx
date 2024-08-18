'use client';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CinetechAssistant from '@/components/cinetech-assistant';
import styles from '@/styles/assistant.module.css';
import { FaUserCircle } from 'react-icons/fa';
import { generatePdfWithSelectedMessages } from '@/utils/generateShotSheet';


interface Message {
  id: string;
  role: string;
  content: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    console.log('Session data:', session);
  }, [session]);

  const [screenOrientation, setScreenOrientation] = useState<string>("portrait");
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);
  const [isCreativeToolsExpanded, setIsCreativeToolsExpanded] = useState(false);
  const [isUserMenuExpanded, setIsUserMenuExpanded] = useState(false);

  const userId = session?.user?.id ? String(session.user.id) : ''; // Ensure userId is available

  const toggleCreativeToolsExpand = () => {
    setIsCreativeToolsExpanded(!isCreativeToolsExpanded);
  };

  const toggleUserMenuExpand = () => {
    setIsUserMenuExpanded(!isUserMenuExpanded);
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

  const handleProfileClick = () => {
    router.push('/profile'); // Adjust this path as needed
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col ml-0 md:ml-80">
        <header className={styles.header}>
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
            <div className={styles.userIconContainer} onClick={toggleUserMenuExpand}>
              <FaUserCircle className={styles.userIcon} />
              {isUserMenuExpanded && (
                <ul className={styles.userDropdown}>
                  <li onClick={handleProfileClick} className={styles.userMenuItem}>Profile</li>
                  <li onClick={handleLogout} className={styles.userMenuItem}>Logout</li>
                </ul>
              )}
            </div>
          </div>
        </header>
        <main className={styles.main}>
          <CinetechAssistant
            assistantId="asst_fmjzsttDthGzzJud4Vv2bDGq"
            greeting="Loading..."
            setSelectedMessages={setSelectedMessages}
            selectedMessages={selectedMessages}
          />
        </main>
      </div>
    </div>
  );
}