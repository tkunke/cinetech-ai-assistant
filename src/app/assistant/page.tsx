'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CinetechAssistant from '@/components/cinetech-assistant';
import styles from '@/styles/assistant.module.css';
import { jsPDF } from 'jspdf';
import { FaUserCircle, FaRocketchat } from 'react-icons/fa';
import { generatePdfWithSelectedMessages } from '@/utils/generateShotSheet';
import { generateThreadSynopsis } from '@/utils/generateThreadSynopsis';


interface Message {
  id: string;
  role: string;
  content: string;
}

export default function Home() {
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

  const userId = session?.user?.id ? String(session.user.id) : ''; // Ensure userId is available
  let threadId = '';

  if (typeof window !== 'undefined') {
    threadId = sessionStorage.getItem('threadId') || '';
  }

  // Load assistantId from session storage or URL parameters
  useEffect(() => {
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
  }, []);

  const toggleCreativeToolsExpand = () => {
    setIsCreativeToolsExpanded(!isCreativeToolsExpanded);
  };

  const toggleUserMenuExpand = () => {
    console.log("User menu expanded:", !isUserMenuExpanded);
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
    sessionStorage.clear();
    signOut({
      callbackUrl: '/logout',
    });
  };

  const handleProfileClick = () => {
    router.push('/profile'); // Adjust this path as needed
  };

  const handleCreditAdd = () => {
    router.push('/purchasecredits');
  };

  const handleMouseLeave = () => {
    setIsCreativeToolsExpanded(false);
    setIsUserMenuExpanded(false);
  };

  const handleGenerateSynopsisClick = async () => {
    const savedThreadId = sessionStorage.getItem('threadId');
    const assistantId = 'asst_fmjzsttDthGzzJud4Vv2bDGq';
    
    if (savedThreadId && assistantId) {
        const synopsis = await generateThreadSynopsis(savedThreadId);
        console.log('Generated Synopsis:', synopsis);

        if (synopsis) {
            // Create a new jsPDF instance
            const pdf = new jsPDF();

            // Set title for the document
            pdf.setFontSize(18);
            pdf.text('Conversation Synopsis', 10, 10);

            // Add the synopsis text, split into lines
            pdf.setFontSize(12);
            const lines = pdf.splitTextToSize(synopsis, 180); // Wrap the text to fit the page width
            let y = 30; // Start the text 30 units down the page to leave room for the title
            const pageHeight = pdf.internal.pageSize.height;

            lines.forEach((line: string) => {
                if (y + 10 > pageHeight) { // Check if adding the next line would overflow the page
                    pdf.addPage(); // Add a new page if we're close to the bottom
                    y = 10; // Reset y position for the new page
                }
                pdf.text(line, 10, y);
                y += 10; // Move down the line height
            });

            // Save the PDF with a relevant filename
            pdf.save('Conversation_Synopsis.pdf');
        } else {
            alert("Failed to generate synopsis.");
        }
    } else {
        alert("No active thread found.");
    }
  };

  const handleStartNewThreadClick = () => {
    // Clear session storage
    sessionStorage.clear();

    // Call the reset function directly from the ref
    if (resetMessagesRef.current) {
      resetMessagesRef.current(); // Call the reset function stored in the ref
    }

    console.log('Cleared state and storage for starting a new thread');
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col ml-0 md:ml-80">
        <header className={styles.header}>
          <div className={styles.leftSection}>
            <button className={styles.chatButton} onClick={handleStartNewThreadClick}>
              <FaRocketchat
                title='Start New Conversation'
              />
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
                  <li onClick={handleGeneratePdfClick} className={styles.creativeToolsButton}>Generate Shot Sheet</li>
                  {/* Add more buttons or links here as needed */}
                </ul>
              )}
            </div>
            <button onClick={handleGenerateSynopsisClick} style={{ display: 'block' }}>
              Generate Synopsis
            </button>
          </div>
          <div className={styles.middleSection}>
          </div>
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