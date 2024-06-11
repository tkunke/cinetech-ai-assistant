'use client';
import { useState, useEffect } from 'react';
import CinetechAssistant from '@/components/cinetech-assistant';
import Sidebar from '@/components/sidebar';
import styles from '@/styles/assistant.module.css';
import { generatePdfWithSelectedMessages } from '@/utils/generateShotSheet';

interface Message {
  id: string;
  role: string;
  content: string;
}

export default function Home() {
  const [screenOrientation, setScreenOrientation] = useState<string>("portrait");
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);
  const [imageLibrary, setImageLibrary] = useState<string[]>([]);

  useEffect(() => {
    const getScreenOrientation = (): string => {
      return window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
    };

    const handleOrientationChange = () => {
      setScreenOrientation(getScreenOrientation());
    };

    setScreenOrientation(getScreenOrientation()); // Initial check

    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  const addToImageLibrary = (imageUrl: string) => {
    setImageLibrary((prevLibrary) => [...prevLibrary, imageUrl]);
  };

  const handleGeneratePdfClick = async () => {
    console.log('Selected Messages:', selectedMessages);
    if (selectedMessages.length === 2) {
      const [breakdownMessage, imageMessage] = selectedMessages;
      await generatePdfWithSelectedMessages([breakdownMessage, imageMessage]);
    } else {
      alert("Please select one breakdown message and one image message.");
    } setSelectedMessages([]); // Clear the selected messages
  };

  return (
    <div className="flex h-screen">
      <Sidebar generatePdf={handleGeneratePdfClick} imageLibrary={imageLibrary} />
      <div className="flex-1 flex flex-col ml-0 md:ml-64">
        <header className={styles.header}></header>
        <main className={styles.main}>
          <CinetechAssistant
            assistantId="asst_fmjzsttDthGzzJud4Vv2bDGq"
            greeting="Hey there! How can I help?"
            setSelectedMessages={setSelectedMessages}
            selectedMessages={selectedMessages}
            addToImageLibrary={addToImageLibrary}
          />
        </main>
      </div>
    </div>
  );
}
