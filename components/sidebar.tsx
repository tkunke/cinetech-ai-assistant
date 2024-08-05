import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import styles from '@/styles/sidebar.module.css';
import { FaPlus, FaTag, FaTrash } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLibrary } from '@/context/LibraryContext';
import 'react-resizable/css/styles.css';

interface SidebarProps {
  generatePdf: () => void;
  userId: string; // Pass the user ID to the Sidebar
}

interface Message {
  content: string;
  url: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Image {
  imageUrl: string;
  thumbnailUrl: string;
  tags: Tag[];
}

interface ImageItem extends Image {
  tags: Tag[];
}

const Sidebar: React.FC<SidebarProps> = ({ generatePdf, userId }) => {
  const { fetchedImages, fetchedMessages, fetchImages, fetchMessages: libraryFetchMessages } = useLibrary();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(false);
  const [isMessagesLibExpanded, setIsMessagesLibExpanded] = useState(false);
  const [isImageLibraryExpanded, setIsImageLibraryExpanded] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [messagesWithContent, setMessagesWithContent] = useState<Message[]>([]);
  const [hasFetchedMessages, setHasFetchedMessages] = useState(false);
  const [hasFetchedImages, setHasFetchedImages] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isTaggingPopupVisible, setIsTaggingPopupVisible] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [hasFetchedTags, setHasFetchedTags] = useState(false);
  const [isTagsDropdownVisible, setIsTagsDropdownVisible] = useState(false);
  const [taggingImage, setTaggingImage] = useState<ImageItem | null>(null);
  const [isTagPopupVisible, setIsTagPopupVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [objectsWithTag, setObjectsWithTag] = useState<ImageItem[]>([]);
  const [boxWidth, setBoxWidth] = useState(500);
  const [boxHeight, setBoxHeight] = useState(300);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });


  const router = useRouter();

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const toggleWorkspaceExpand = () => {
    setIsWorkspaceExpanded(!isWorkspaceExpanded);
  };

  const toggleMessagesLibExpand = () => {
    setIsMessagesLibExpanded((prev) => !prev);
    console.log(`Messages library expanded state is now: ${!isMessagesLibExpanded}`);
  };

  const toggleImageLibraryExpand = () => {
    setIsImageLibraryExpanded((prev) => !prev);
    console.log(`Image library expanded state is now: ${!isImageLibraryExpanded}`); // Add this log
  };  

  const togglePopup = () => {
    setIsPopupVisible(!isPopupVisible);
  };

  const createTag = () => {
    togglePopup();
  };

  const handleTagNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagName(e.target.value);
  };

  const handleTagSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    try {
      const response = await fetch('/api/userTags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, tag: { name: tagName } }), // Ensure tag is an object with name property
      });
  
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags);
        setTagName(''); // Reset the input field
        togglePopup(); // Close the pop-up
      } else {
        console.error('Failed to add tag:', await response.json());
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };  

  const fetchTags = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/userTags?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        setTags(data.tags);
        setHasFetchedTags(true);
      } else {
        console.error('Failed to fetch tags:', data.error);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }, []);

  const fetchObjectsByTag = async (tag: Tag) => {
    try {
      console.log(`Fetching objects for tag: ${tag.name}`);
      const response = await fetch(`/api/getObjectsByTag?userId=${userId}&tag=${tag.name}`);
      const data = await response.json();
  
      if (response.ok) {
        console.log('Fetched objects:', data);
        const mappedImages = data.images.map((img: any) => ({
          imageUrl: img.image_url,
          thumbnailUrl: img.thumbnail_url,
          tags: [] // Assuming tags are not returned in the response
        }));
        setObjectsWithTag(mappedImages); // Update state with mapped images
        setSelectedTag(tag);
        setIsTagPopupVisible(true);
      } else {
        console.error('Failed to fetch objects:', data.error);
      }
    } catch (error) {
      console.error('Error fetching objects by tag:', error);
    }
  };        

  const toggleTagsDropdown = () => {
    setIsTagsDropdownVisible(!isTagsDropdownVisible);
  };

  const handleTagIconClick = (image: ImageItem) => {
    setTaggingImage(image);
    setIsTaggingPopupVisible(true);
  };

  const handleTagSelect = async (tag: Tag) => {
    if (taggingImage) {
      const updatedImage = {
        ...taggingImage,
        tags: [...taggingImage.tags, tag],
      };
      setTaggingImage(null);
      setIsTaggingPopupVisible(false);
  
      try {
        const response = await fetch('/api/userTags', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, imageUrl: taggingImage.imageUrl, tag }),
        });
  
        const data = await response.json();
        if (response.ok) {
          // Update the local state with the new tags
          const updatedImages = fetchedImages.map(image =>
            image.imageUrl === taggingImage.imageUrl ? updatedImage : image
          );
          setHasFetchedImages(true); // Ensure you have a setter for updating the images
          console.log('Tag updated successfully:', updatedImage);
        } else {
          console.error('Error updating tag:', data.error);
        }
      } catch (error) {
        console.error('Error updating tag:', error);
      }
    }
  };          
  
  const handleTagClick = (tag: Tag) => {
    fetchObjectsByTag(tag);
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const response = await fetch('/api/userTags', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, tagId }),
      });
  
      if (response.ok) {
        // Refresh tags after deletion
        fetchTags(userId);
        setIsTagPopupVisible(false); // Close the pop-up after deletion
      } else {
        console.error('Failed to delete tag:', await response.json());
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };  

  useEffect(() => {
    if (userId) {
      fetchTags(userId);
    }
  }, [userId, fetchTags]);

  const handleResize = (event: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    setBoxWidth(size.width);
    setBoxHeight(size.height);
  };

  useEffect(() => {
    const centerX = (window.innerWidth - boxWidth) / 2;
    const centerY = (window.innerHeight - boxHeight) / 2;
    setInitialPosition({ x: centerX, y: centerY });
  }, [boxWidth, boxHeight]);
  

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

  const fetchMessageContents = useCallback(async (messages: Message[]) => {
    try {
      console.log('Messages to fetch content for:', messages);
      const messagesWithContent = await Promise.all(messages.map(async (message) => {
        console.log('Fetching content for message:', message);
        const response = await fetch(message.url);
        const data = await response.json();
        console.log('Fetched message content:', data);
        return { ...message, content: data.content };
      }));
      console.log('Messages with content:', messagesWithContent);
      setMessagesWithContent(messagesWithContent);
    } catch (error) {
      console.error('Error fetching message contents:', error);
    }
  }, []);

  useEffect(() => {
    if (isImageLibraryExpanded && !hasFetchedImages && userId) {
      console.log('Image library expanded, fetching images...');
      fetchImages(userId);
      setHasFetchedImages(true);
    }
  }, [isImageLibraryExpanded, userId, fetchImages, hasFetchedImages]);

  useEffect(() => {
    if (isMessagesLibExpanded && !hasFetchedMessages && userId) {
      console.log('Messages library expanded, fetching messages...');
      libraryFetchMessages(userId).then((formattedMessages) => {
        console.log('Messages fetched, fetching message contents...');
        fetchMessageContents(formattedMessages);
      });
      setHasFetchedMessages(true);
    }
  }, [isMessagesLibExpanded, userId, libraryFetchMessages, fetchMessageContents, hasFetchedMessages]);

  useEffect(() => {
    if (isTagsDropdownVisible && !hasFetchedTags && userId) {
      console.log('Tags dropdown expanded, fetching tags...');
      fetchTags(userId);
    }
  }, [isTagsDropdownVisible, hasFetchedTags, userId, fetchTags]);

  const handleTextLineClick = (message: Message) => {
    setSelectedMessage(message);
  };
  

  const handleDragStart = (e: DraggableEvent, data: DraggableData): false | void => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('react-resizable-handle')) {
      return false; // Prevent dragging if the target is a resize handle
    }
  };

  const handleCloseMessageWindow = () => {
    setSelectedMessage(null);
  };

  const handleLogout = () => {
    signOut({
      callbackUrl: '/logout',
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  };

  const transformedImages: ImageItem[] = fetchedImages.map((image: Image) => ({
    ...image,
    tags: image.tags || [], // Ensure tags are not overwritten
  }));  

  return (
    <>
      <button className={styles.hamburger} onClick={toggleSidebar}>
        ☰
      </button>
      <div className={`${styles.sidebar} ${isSidebarVisible ? styles.visible : styles.hidden}`}>
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
              <button className={styles.sidebarButton} onClick={generatePdf}>
                Generate Shot Sheet
              </button>
            </div>
          )}
          <button
            className="mt-4 w-full bg-opacity-100 hover:bg-gray-700 text-left text-white font-bold py-2 px-4 rounded"
            onClick={toggleMessagesLibExpand}
          >
            Messages Library
          </button>
          {isMessagesLibExpanded && (
            <div className={`${styles.expandedSection} ${styles.textList}`}>
              {messagesWithContent.map((message, index) => (
                <div key={index} className={styles.textLine} onClick={() => handleTextLineClick(message)}>
                  {truncateText(message.content, 30)}
                </div>
              ))}
            </div>
          )}
          <button
            className="mt-4 w-full bg-opacity-100 hover:bg-gray-700 text-left text-white font-bold py-2 px-4 rounded"
            onClick={toggleImageLibraryExpand}
          >
            Image Library
          </button>
          {isImageLibraryExpanded && (
            <div className={`${styles.expandedSection} ${styles.thumbnailGrid}`}>
              {transformedImages.map((image: ImageItem, index) => (
                <div key={index} className={styles.thumbnailContainer}>
                  <a href={image.imageUrl} target="_blank" rel="noopener noreferrer">
                    <Image src={image.thumbnailUrl} alt={`Image ${index + 1}`} width="75" height="75" className={styles.thumbnail} />
                  </a>
                  <FaTag
                    className={styles.tagIcon}
                    onClick={() => handleTagIconClick(image)}
                  />
                  {image.tags.map((tag) => (
                    <span key={tag.id} className={styles.imageTag}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
          <button
            className="mt-4 w-full bg-opacity-100 hover:bg-gray-700 text-left text-white font-bold py-2 px-4 rounded"
            onClick={toggleTagsDropdown}
          >
            Tags
          </button>
          {isTagsDropdownVisible && (
            <div className={styles.expandedSection}>
              <div className={styles.textLine} onClick={createTag}>
                <FaPlus style={{ marginRight: '8px' }} />
                Create New Tag
              </div>
              {tags.map((tag) => (
                <div key={tag.id} className={styles.textLine} onClick={() => handleTagClick(tag)}>
                  {tag.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.bottomSection}>
          <nav className="flex justify-between space-x-2">
            <Link href="/contact" className="hover:bg-gray-700 p-2 rounded">
              Contact
            </Link>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </nav>
        </div>
      </div>
      {isPopupVisible && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={togglePopup}>
              X
            </button>
            <form onSubmit={handleTagSubmit}>
              <label htmlFor="tagName">Tag Name:</label>
              <input
                type="text"
                id="tagName"
                value={tagName}
                onChange={handleTagNameChange}
                required
              />
              <button type="submit">Create Tag</button>
            </form>
          </div>
        </div>
      )}
      {isTaggingPopupVisible && taggingImage && (
        <div className={styles.tagPopupOverlay}>
          <div className={styles.tagPopup}>
            <button className={styles.closeButton} onClick={() => setIsTaggingPopupVisible(false)}>
              X
            </button>
            <h3>Select a Tag</h3>
            <ul className={styles.tagList}>
              {tags.map((tag) => (
                <li key={tag.id} onClick={() => handleTagSelect(tag)}>
                  {tag.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {isTagPopupVisible && selectedTag && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => setIsTagPopupVisible(false)}>
              X
            </button>
            <h3>{selectedTag.name}</h3>
            <button className={styles.deleteButton} onClick={() => handleDeleteTag(selectedTag.id)}>
              <FaTrash />
              Delete Tag
            </button>
            <div className={styles.thumbnailGrid}>
              {objectsWithTag.length > 0 ? (
                objectsWithTag.map((image, index) => {
                  console.log('Rendering image:', image.imageUrl);
                  return (
                    <div key={index} className={styles.thumbnailContainer}>
                      <a href={image.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={image.imageUrl}
                          alt={`Image ${index + 1}`}
                          width="75"
                          height="75"
                          className={styles.thumbnail}
                        />
                      </a>
                    </div>
                  );
                })
              ) : (
                <p>No images found.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {selectedMessage && (
        <Draggable
          defaultPosition={initialPosition}
          handle=".drag-handle"
          onStart={handleDragStart}
        >
          <div className={`${styles.draggableContainer} drag-handle`}>
            <ResizableBox
              className={styles.resizableBox}
              width={boxWidth}
              height={boxHeight}
              minConstraints={[100, 100]}
              maxConstraints={[1200, 1200]}
              resizeHandles={['se']}
              onResize={handleResize}
            >
              <div className={styles.messageWindow}>
                <div className={styles.messageContent}>
                  <button className={styles.closeButton} onClick={handleCloseMessageWindow}>
                    X
                  </button>
                  <ReactMarkdown>{selectedMessage.content}</ReactMarkdown>
                </div>
              </div>
            </ResizableBox>
          </div>
        </Draggable>
      )}
    </>
  );
};

export default Sidebar;
