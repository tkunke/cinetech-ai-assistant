"use client";

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import styles from '@/styles/shotpanels.module.css';
import {generatePdfWithSelectedMessages} from '@/utils/generateShotSheet';

interface Message {
  id: string;
  content: string;
  metadata: {
    breakdownMessage?: boolean;
    panelMessage?: boolean;
  };
}

const ShotPanels = () => {
  const [breakdownMessages, setBreakdownMessages] = useState<Message[]>([]);
  const [panelMessages, setPanelMessages] = useState<Message[]>([]);
  const [selectedBreakdownMessage, setSelectedBreakdownMessage] = useState<Message | null>(null);
  const [selectedPanelMessages, setSelectedPanelMessages] = useState<Message[]>([]);
  const router = useRouter();

  useEffect(() => {
    const storedBreakdownMessages = sessionStorage.getItem('breakdownMessages');
    const storedPanelMessages = sessionStorage.getItem('panelMessages');

    if (storedBreakdownMessages && storedPanelMessages) {
      setBreakdownMessages(JSON.parse(storedBreakdownMessages));
      setPanelMessages(JSON.parse(storedPanelMessages));
    } else {
      // Handle case where no messages are found
      console.error('No breakdown or panel messages found.');
    }
  }, []);

  // Handle breakdown selection
  const handleBreakdownSelect = (message: Message) => {
    setSelectedBreakdownMessage(message);
  };

  // Handle panel selection (allow multiple panels to be selected)
  const handlePanelSelect = (message: Message) => {
    if (selectedPanelMessages.includes(message)) {
      setSelectedPanelMessages(selectedPanelMessages.filter((msg) => msg.id !== message.id));
    } else {
      setSelectedPanelMessages([...selectedPanelMessages, message]);
    }
  };

  const handleCreatePanelSheetClick = async () => {
    // Filter out null values from the selected breakdown message
    const selectedMessages = [
      ...(selectedBreakdownMessage ? [selectedBreakdownMessage] : []), // Add breakdown message if it's not null
      ...selectedPanelMessages,
    ];
  
    if (selectedMessages.length > 0) {
      await generatePdfWithSelectedMessages(selectedMessages); // Call the utility function
    } else {
      alert("Please select a breakdown message and at least one panel message.");
    }
    setSelectedBreakdownMessage(null);
    setSelectedPanelMessages([]);
};

    const handleBackToAssistantClick = () => {
        router.push('/assistant'); // Navigate back to the assistant page
    };

  return (
    <div className={styles.shotpanelsPage}>
      {/* Header Section */}
      <header className={styles.header}>
        <button className={styles.backButton} onClick={handleBackToAssistantClick}>
          Back to Assistant
        </button>
        <button className={styles.createButton} onClick={handleCreatePanelSheetClick}>
          Create Panel Sheet
        </button>
      </header>

      <div className={styles.splitScreen}>
        {/* Left side: Breakdown messages */}
        <div className={`${styles.scrollable} ${styles.leftPane}`}>
          <h3 className={styles.headerTitle}>Breakdown Messages</h3>
          {breakdownMessages.map((message) => (
            <div
              key={message.id}
              className={`${styles.messageItem} ${selectedBreakdownMessage?.id === message.id ? styles.selected : ''}`}
              onClick={() => setSelectedBreakdownMessage(message)}
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ))}
        </div>

        {/* Right side: Panel messages */}
        <div className={`${styles.scrollable} ${styles.rightPane}`}>
          <h3 className={styles.headerTitle}>Panel Messages</h3>
          {panelMessages.map((message) => (
            <div
              key={message.id}
              className={`${styles.messageItem} ${selectedPanelMessages.includes(message) ? styles.selected : ''}`}
              onClick={() => {
                if (selectedPanelMessages.includes(message)) {
                  setSelectedPanelMessages(prev => prev.filter(m => m.id !== message.id));
                } else {
                  setSelectedPanelMessages(prev => [...prev, message]);
                }
              }}
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShotPanels;
