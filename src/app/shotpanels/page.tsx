"use client";

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import styles from '@/styles/shotpanels.module.css';
import { generatePdfWithSelectedMessages } from '@/utils/generateShotSheet';
import { AiOutlineFilePdf, AiOutlineArrowLeft } from 'react-icons/ai';

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
  const [pdfGenerated, setPdfGenerated] = useState<boolean>(false); // State to track PDF generation
  const [pdfThumbnail, setPdfThumbnail] = useState<string>(''); // State to track PDF thumbnail
  const [pdfName, setPdfName] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const storedBreakdownMessages = sessionStorage.getItem('breakdownMessages');
    const storedPanelMessages = sessionStorage.getItem('panelMessages');

    if (storedBreakdownMessages && storedPanelMessages) {
      setBreakdownMessages(JSON.parse(storedBreakdownMessages));
      setPanelMessages(JSON.parse(storedPanelMessages));
    } else {
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

  // Simulate PDF thumbnail creation (replace this with actual logic if available)
  const createPdfThumbnail = () => {
    // Simulate setting a thumbnail image for the PDF (you can customize this)
    setPdfThumbnail('/pdf_thumbnail.png'); // Assuming you have a placeholder image for the PDF
  };

  const handleCreatePanelSheetClick = async () => {
    const selectedMessages = [
      ...(selectedBreakdownMessage ? [selectedBreakdownMessage] : []),
      ...selectedPanelMessages,
    ];

    if (selectedMessages.length > 0) {
      const pdfFileName = await generatePdfWithSelectedMessages(selectedMessages); // Call the utility function
      if (pdfFileName) {
        setPdfGenerated(true); // Set PDF as generated
        setPdfName(pdfFileName); // Store the PDF name
      }
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
        <button onClick={handleBackToAssistantClick} className={styles.backButton} title="Back to Assistant">
          <AiOutlineArrowLeft className={styles.arrowIcon}/>
          <span>Assistant</span>
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

      {/* Footer Section (conditionally rendered) */}
      {pdfGenerated && (
        <footer className={styles.footer}>
          <div className={styles.pdfThumbnail}>
            <AiOutlineFilePdf size={35} />
            <p>{pdfName}.pdf</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default ShotPanels;
