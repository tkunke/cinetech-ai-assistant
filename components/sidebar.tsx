'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/sidebar.module.css';
import { FaFilm } from 'react-icons/fa';

interface SidebarProps {
  generatePdf: () => void;
  imageLibrary: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ generatePdf, imageLibrary }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isCreativeExpanded, setIsCreativeExpanded] = useState(false);
  const [isExpertExpanded, setIsExpertExpanded] = useState(false);
  const [isImageLibraryExpanded, setIsImageLibraryExpanded] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const toggleCreativeExpand = () => {
    setIsCreativeExpanded(!isCreativeExpanded);
  };

  const toggleExpertExpand = () => {
    setIsExpertExpanded(!isExpertExpanded);
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
            onClick={toggleExpertExpand}
          >
            Expert Tools
          </button>
          {isExpertExpanded && (
            <div className={styles.expandedSection}>
              <button className={styles.sidebarButton} onClick={() => alert('Tool 1 clicked')}>
                Lens Lore
              </button>
              <button className={styles.sidebarButton} onClick={() => alert('Tool 2 clicked')}>
                CineMetric Toolkit
              </button>
              <button className={styles.sidebarButton} onClick={() => alert('Tool 3 clicked')}>
                Color Science
              </button>
            </div>
          )}
          <button
            className="mt-4 w-full bg-opacity:100 hover:bg-gray-700 text-left text-white font-bold py-2 px-4 rounded"
            onClick={toggleImageLibraryExpand}
          >
            Image Library
          </button>
          {isImageLibraryExpanded && (
            <div className={styles.expandedSection}>
              {imageLibrary.map((url: string, index: number) => (
                <div key={index} className={styles.thumbnailContainer}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Image src={url} alt={`Image ${index + 1}`} width="50" height="50" className={styles.thumbnail} />
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
    </>
  );
};

export default Sidebar as React.FC<SidebarProps>;
