import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/sidebar.module.css';
import { FaFilm } from 'react-icons/fa';

interface SidebarProps {
  generatePdf: () => void;
  imageLibrary: { imageUrl: string; thumbnailUrl: string }[];
  messagesLibrary: { content: string; thumbnailUrl: string }[];
}

interface Message {
  content: string;
  thumbnailUrl: string;
}

const Sidebar: React.FC<SidebarProps> = ({ generatePdf, imageLibrary = [], messagesLibrary = [] }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isCreativeExpanded, setIsCreativeExpanded] = useState(false);
  const [isMessagesLibExpanded, setIsMessagesLibExpanded] = useState(false);
  const [isImageLibraryExpanded, setIsImageLibraryExpanded] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const toggleCreativeExpand = () => {
    setIsCreativeExpanded(!isCreativeExpanded);
  };

  const toggleMessagesLibExpand = () => {
    setIsMessagesLibExpanded(!isMessagesLibExpanded);
  };

  const toggleImageLibraryExpand = () => {
    setIsImageLibraryExpanded(!isImageLibraryExpanded);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarVisible(true);
      } else {
        setIsSidebarVisible(false);
      }
    };

    handleResize(); // Check the screen size on component mount
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleThumbnailClick = (message: Message) => {
    setSelectedMessage(message);
  };

  const handleCloseMessageWindow = () => {
    setSelectedMessage(null);
  };

  return (
    <>
      <button className={styles.hamburger} onClick={toggleSidebar}>
        ☰
      </button>
      <div className={`${styles.sidebar} ${isSidebarVisible ? styles.visible : styles.hidden}`}>
        <div className={styles.topSection}>
          <Link href="/">
            <Image
              src="/cinetech_art.png"
              alt="Cinetech Logo"
              width="200"
              height="200"
            />
          </Link>
          <button
            className="mt-4 w-full bg-opacity:100 hover:bg-gray-700 text-left text-white font-bold py-2 px-4 rounded"
            onClick={toggleCreativeExpand}
          >
            Creative Tools
          </button>
          {isCreativeExpanded && (
            <div className={styles.expandedSection}>
              <button className={styles.sidebarButton} onClick={generatePdf}>
                <FaFilm /> Generate Shot Sheet
              </button>
            </div>
          )}
          <button
            className="mt-4 w-full bg-opacity:100 hover:bg-gray-700 text-left text-white font-bold py-2 px-4 rounded"
            onClick={toggleMessagesLibExpand}
          >
            Messages Library
          </button>
          {isMessagesLibExpanded && (
            <div className={`${styles.expandedSection} ${styles.thumbnailGrid}`}>
              {messagesLibrary.map((message, index) => (
                <div
                  key={index}
                  className={styles.thumbnailContainer}
                  onClick={() => handleThumbnailClick(message)}
                  style={{ backgroundImage: `url(${message.thumbnailUrl})` }}
                ></div>
              ))}
            </div>
          )}
          <button
            className="mt-4 w-full bg-opacity:100 hover:bg-gray-700 text-left text-white font-bold py-2 px-4 rounded"
            onClick={toggleImageLibraryExpand}
          >
            Image Library
          </button>
          {isImageLibraryExpanded && (
            <div className={`${styles.expandedSection} ${styles.thumbnailGrid}`}>
              {imageLibrary.map((image, index) => (
                <div key={index} className={styles.thumbnailContainer}>
                  <a href={image.imageUrl} target="_blank" rel="noopener noreferrer">
                    <Image src={image.thumbnailUrl} alt={`Image ${index + 1}`} width="50" height="50" className={styles.thumbnail} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.bottomSection}>
          <nav className="flex flex-col space-y-2">
            <Link href="/contact" className="hover:bg-gray-700 p-2 rounded">
              Contact
            </Link>
          </nav>
        </div>
      </div>
      {selectedMessage && (
        <div className={styles.messageWindow}>
          <button className={styles.closeButton} onClick={handleCloseMessageWindow}>X</button>
          <div className={styles.messageContent}>
            <p>{selectedMessage.content}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
