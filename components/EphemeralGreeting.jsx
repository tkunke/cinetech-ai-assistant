import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import styles from '@/styles/EphemeralGreeting.module.css';
import { useThreads } from '@/context/ThreadsContext'; 

export default function EphemeralGreeting({ onSelectThread }) {
  const [showGreeting, setShowGreeting] = useState(false);
  const [dynamicGreeting, setDynamicGreeting] = useState('');
  const [recentThreads, setRecentThreads] = useState([]);
  const [analysisData, setAnalysisData] = useState({});
  const { data: session } = useSession();
  const { threads, fetchThreads } = useThreads(); 

  const userFirstName = session?.user?.first_name || 'User';
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);

  const handleInteraction = useCallback(() => {
    setShowGreeting(false);
  }, []);

  const getSalutation = () => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      return 'Good morning';
    } else if (currentHour < 18) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  useEffect(() => {
    const greetingShown = sessionStorage.getItem('greetingShown');
    if (!greetingShown) {
      setShowGreeting(true);
      sessionStorage.setItem('greetingShown', 'true');
    }
  }, []);

  useEffect(() => {
    const loadGreetings = async () => {
      try {
        const salutation = getSalutation();
        const response = await fetch('/greetingMessages.json');
        const greetings = await response.json();
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        setDynamicGreeting(`${salutation}, ${userFirstName}! ${randomGreeting}`);
      } catch (error) {
        console.error('Error loading greetings:', error);
      }
    };
    if (session) {
      loadGreetings();
    }
  }, [session, userFirstName]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchThreads(session.user.id);
    }
  }, [fetchThreads, session]);

  useEffect(() => {
    if (threads.length > 2) {
      const sortedThreads = threads.sort((a, b) => new Date(b.last_active) - new Date(a.last_active));
      const recent = sortedThreads.slice(0, 2); // Take two most recent threads
      setRecentThreads(recent);
    }
  }, [threads]);

  useEffect(() => {
    const fetchAnalysisData = async (threadId) => {
      try {
        const response = await fetch(`/api/saveAnalysis?threadId=${threadId}`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching analysis:', error);
        return {};
      }
    };

    if (recentThreads.length > 0) {
      recentThreads.forEach(async (thread) => {
        const data = await fetchAnalysisData(thread.id);
        setAnalysisData((prevData) => ({
          ...prevData,
          [thread.id]: data,
        }));
      });
    }
  }, [recentThreads]);

  const handleThreadClick = (threadId) => {
    onSelectThread(threadId);
    sessionStorage.setItem('threadId', threadId);
    setShowGreeting(false); // Hide the ephemeral greeting after loading the thread
  };

  const getFontSize = (percentage) => {
    const size = parseInt(percentage, 10);
    return `${Math.max(12, size * 0.5)}px`; // Adjust font size multiplier as needed
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
  
    // Normalize both dates by setting hours, minutes, and seconds to 0
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const threadDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
    // Calculate the difference in milliseconds, then convert to days
    const diffInMs = today - threadDate;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays <= 5) {
      return `${diffInDays} days ago`;
    } else {
      return threadDate.toLocaleDateString('en-US', {
        month: 'short', // "Sep"
        day: 'numeric', // "20"
      });
    }
  };    

  useEffect(() => {
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [handleInteraction]);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
  
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const filteredThreads = screenWidth <= 1020 ? recentThreads.slice(-1) : recentThreads;
  const shouldRenderThreadsContainer = screenWidth >= 1530 && screenHeight >= 750;

  if (!showGreeting || !dynamicGreeting) return null;

  function fitWordsIntoBox(topics, keywords, boxWidth, boxHeight) {
    // Combine both topics and keywords into one array
    const allWords = [
      ...topics.map(({ topic, weight }) => ({ word: topic, weight })),
      ...keywords.map(({ keyword, weight }) => ({ word: keyword, weight })),
    ];
  
    // Calculate total weight of all words
    const totalWeight = allWords.reduce((sum, { weight }) => sum + parseFloat(weight), 0);
  
    // Calculate scaling factor based on both width and height of the box
    const scalingFactor = Math.min(boxWidth, boxHeight) / totalWeight;
  
    // Return adjusted words with scaled font size, and ensure font size is never smaller than 8px or larger than 32px
    return allWords.map(({ word, weight }) => {
      const fontSize = Math.max(Math.min(scalingFactor * parseFloat(weight), 18), 10); // Set max 32px and min 8px
      return { word, fontSize };
    });
  }         

  return (
    <div className={styles.greetingOverlay}>
      <p className={styles.greetingMessage}>{dynamicGreeting}</p>
      {shouldRenderThreadsContainer && recentThreads.length > 0 && (
        <>
          <div className={styles.outerThreadsContainer}>
            <p className={styles.pickupText}>Would you like to pick up where you left off?</p>
            <div className={styles.threadsContainer}>
            {recentThreads.map((thread) => {
              // Dynamically set box width and height
              const boxWidth = screenWidth > 900 ? 320 : screenWidth * 0.4; // Example dynamic size
              const boxHeight = screenWidth > 900 ? 180 : screenWidth * 0.2;
                        
              return (
                <div key={thread.id} className={styles.threadBox} onClick={() => handleThreadClick(thread.id)}>
                  <p className={styles.threadTimestamp}>{formatTimestamp(thread.last_active)}</p>
                  {analysisData[thread.id] && (
                    <div className={styles.wordCloud}>
                      {fitWordsIntoBox(
                        analysisData[thread.id].topics,
                        analysisData[thread.id].keywords,
                        boxWidth, 
                        boxHeight
                      ).map(({ word, fontSize }, index) => (
                        <span key={`${word}-${index}`} style={{ fontSize: `${fontSize}px` }}>{word}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </>
      )}
    </div>
  );      
}