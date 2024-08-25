import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaPlus, FaAsterisk, FaTrash, FaChevronRight, FaChevronDown, FaEnvelope, FaFilePdf } from 'react-icons/fa';
import styles from '@/styles/workspace.module.css';
import { generatePdfFromMarkdown } from '@/utils/pdfUtils';
import Image from 'next/image';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import ReactMarkdown from 'react-markdown';
import { useLibrary } from '@/context/LibraryContext';
import 'react-resizable/css/styles.css';

interface WorkspaceProps {
  userId: string;
}

interface Message {
  content: string;
  url: string;
  timestamp: string;
  tags: Tag[];
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

const Workspace: React.FC<WorkspaceProps> = ({ userId }) => {
  const { fetchedImages, fetchImages, fetchedMessages, fetchMessages: libraryFetchMessages, removeImage } = useLibrary();
  const [messagesWithContent, setMessagesWithContent] = useState<Message[]>([]);
  const [hasFetchedMessages, setHasFetchedMessages] = useState(false);
  const [hasFetchedImages, setHasFetchedImages] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isTaggingPopupVisible, setIsTaggingPopupVisible] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [hasFetchedTags, setHasFetchedTags] = useState(false);
  const [isImageLibraryExpanded, setIsImageLibraryExpanded] = useState(false);
  const [isMessageLibraryExpanded, setIsMessageLibraryExpanded] = useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [taggingImage, setTaggingImage] = useState<ImageItem | null>(null);
  const [taggingMessage, setTaggingMessage] = useState<Message | null>(null);
  const [isTagPopupVisible, setIsTagPopupVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [objectsWithTag, setObjectsWithTag] = useState<ImageItem[]>([]);
  const [messagesWithTag, setMessagesWithTag] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [boxWidth, setBoxWidth] = useState(500);
  const [boxHeight, setBoxHeight] = useState(300);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });

  const handleDownloadMessagePDF = (messageContent: string) => {
    generatePdfFromMarkdown(messageContent);
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
  
        // Process images
        const mappedImages = data.images.map((img: any) => ({
          imageUrl: img.image_url,
          thumbnailUrl: img.thumbnail_url,
          tags: [] // Assuming tags are not returned in the response
        }));
  
        // Process messages
        const mappedMessages = await Promise.all(data.messages.map(async (msg: any) => {
          const messageContentResponse = await fetch(msg.message_url);
          const messageContentData = await messageContentResponse.json();
          return {
            url: msg.message_url,
            timestamp: msg.timestamp,
            content: messageContentData.content || '', // Fetch and include the content
            tags: [] // Assuming tags are not returned in the response
          };
        }));
  
        setObjectsWithTag(mappedImages); // Update state with mapped images
        setMessagesWithTag(mappedMessages); // Update state with mapped messages
        setSelectedTag(tag);
        setIsTagPopupVisible(true);
      } else {
        console.error('Failed to fetch objects:', data.error);
      }
    } catch (error) {
      console.error('Error fetching objects by tag:', error);
    }
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
        setIsPopupVisible(false); // Close the pop-up
      } else {
        console.error('Failed to add tag:', await response.json());
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const handleTagIconClick = (item: ImageItem | Message, type: 'image' | 'message') => {
    console.log("handleTagIconClick called with:", item, type);
    if (type === 'image') {
      setTaggingImage(item as ImageItem);
    } else if (type === 'message') {
      setTaggingMessage(item as Message);
    }
    setIsTaggingPopupVisible(true);
    console.log("isTaggingPopupVisible set to true");
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
          const updatedImages = fetchedImages.map(image =>
            image.imageUrl === taggingImage.imageUrl ? updatedImage : image
          );
          setHasFetchedImages(true);
          console.log('Tag updated successfully:', updatedImage);
        } else {
          console.error('Error updating tag:', data.error);
        }
      } catch (error) {
        console.error('Error updating tag:', error);
      }
    }
  
    if (taggingMessage) {
      const updatedMessage = {
        ...taggingMessage,
        tags: [...(taggingMessage.tags || []), tag],
      };
      setTaggingMessage(null);
      setIsTaggingPopupVisible(false);
  
      try {
        const response = await fetch('/api/userTags', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, messageUrl: taggingMessage.url, tag }),
        });
  
        const data = await response.json();
        if (response.ok) {
          const updatedMessages = messagesWithContent.map(message =>
            message.url === taggingMessage.url ? updatedMessage : message
          );
          setMessagesWithContent(updatedMessages);
          console.log('Tag updated successfully:', updatedMessage);
        } else {
          console.error('Error updating tag:', data.error);
        }
      } catch (error) {
        console.error('Error updating tag:', error);
      }
    }
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
        fetchTags(userId);
        setIsTagPopupVisible(false);
      } else {
        console.error('Failed to delete tag:', await response.json());
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const handleDeleteContent = async (userId: string, contentUrl: string, type: 'image' | 'message') => {
    try {
      const dbResponse = await fetch('/api/saveToPg', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, contentUrl, type }),
      });
  
      if (dbResponse.ok) {
        const result = await dbResponse.json();
        console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully from SQL database`);
  
        const blobResponse = await fetch(`/api/image-store?url=${encodeURIComponent(contentUrl)}&userId=${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        });
  
        if (blobResponse.ok) {
          console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully from blob storage`);
  
          if (type === 'image') {
            removeImage(contentUrl); // Update state after successful deletion
          } else if (type === 'message') {
            setMessagesWithContent(prevMessages => prevMessages.filter(message => message.url !== contentUrl));
          }
        } else {
          const errorResult = await blobResponse.json();
          console.error('Failed to delete file from blob storage:', errorResult.error);
        }
      } else {
        const result = await dbResponse.json();
        console.error('Failed to delete metadata:', result.error);
      }
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };        

  useEffect(() => {
    if (userId) {
      fetchTags(userId);
    }
  }, [userId, fetchTags]);

  const fetchMessageContents = useCallback(async (messages: Message[]) => {
    try {
      console.log('Messages to fetch content for:', messages);
      const messagesWithContent = await Promise.all(messages.map(async (message) => {
        console.log('Fetching content for message:', message);
        const response = await fetch(message.url);
        const data = await response.json();
        console.log('Fetched message content:', data);
        return { ...message, content: data.content, timestamp: data.timestamp };
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
    if (isMessageLibraryExpanded && !hasFetchedMessages && userId) {
      console.log('Messages library expanded, fetching messages...');
      libraryFetchMessages(userId).then((formattedMessages) => {
        fetchMessageContents(formattedMessages); // Fetch the content after fetching the messages
      });
      setHasFetchedMessages(true);
    }
  }, [isMessageLibraryExpanded, userId, libraryFetchMessages, hasFetchedMessages, fetchMessageContents]);    

  useEffect(() => {
    if (isTagsExpanded && !hasFetchedTags && userId) {
      console.log('Tags dropdown expanded, fetching tags...');
      fetchTags(userId);
    }
  }, [isTagsExpanded, hasFetchedTags, userId, fetchTags]);

  useEffect(() => {
    // Preserve existing content while updating messagesWithContent with fetchedMessages
    setMessagesWithContent((prevMessages) => {
      const combinedMessages = [...prevMessages];
  
      fetchedMessages.forEach((fetchedMessage) => {
        const existingIndex = combinedMessages.findIndex(msg => msg.url === fetchedMessage.url);
        if (existingIndex > -1) {
          // Update existing message while preserving content
          combinedMessages[existingIndex] = {
            ...combinedMessages[existingIndex],
            ...fetchedMessage,
            content: fetchedMessage.content || combinedMessages[existingIndex].content,
            timestamp: fetchedMessage.timestamp || combinedMessages[existingIndex].timestamp,
          };
        } else {
          combinedMessages.push(fetchedMessage);
        }
      });
  
      return combinedMessages;
    });
  }, [fetchedMessages]);      

  const toggleImageLibraryExpand = () => {
    setIsImageLibraryExpanded((prev) => !prev);
    console.log(`Image library expanded state is now: ${!isImageLibraryExpanded}`);
  };

  const toggleMessageLibraryExpand = () => {
    setIsMessageLibraryExpanded((prev) => !prev);
    console.log(`Messages library expanded state is now: ${!isMessageLibraryExpanded}`);
  };

  const toggleTagsExpand = () => {
    setIsTagsExpanded((prev) => !prev);
    console.log(`Tags expanded state is now: ${!isTagsExpanded}`);
  };

  const createTag = () => {
    setIsPopupVisible(true);
  };

  const transformedImages: ImageItem[] = fetchedImages.map((image: Image) => ({
    ...image,
    tags: image.tags || [], 
  }));

  const truncateText = (text: string | undefined, maxLength: number) => {
    if (!text) {
      return ''; // Return an empty string if text is undefined or null
    }
  
    if (text.length <= maxLength) {
      return text;
    }
  
    return text.slice(0, maxLength) + '...';
  };  

  const handleTextLineClick = (message: Message) => {
    setSelectedMessage(message);
    const centerX = (window.innerWidth - boxWidth) / 2;
    const centerY = (window.innerHeight - boxHeight) / 2;
    setInitialPosition({ x: centerX, y: centerY });
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

  const handleResize = (event: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    setBoxWidth(size.width);
    setBoxHeight(size.height);
  };

  useEffect(() => {
    if (selectedMessage) {
      const centerX = (window.innerWidth - boxWidth) / 2;
      const centerY = (window.innerHeight - boxHeight) / 2;
      setInitialPosition({ x: centerX, y: centerY });
    }
  }, [selectedMessage, boxWidth, boxHeight]);

  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className={styles.workspaceContainer}>
      <ul className={styles.workspaceList}>
        <li>
          <button
            className={styles.expandButton}
            onClick={toggleMessageLibraryExpand}
          >
            {isMessageLibraryExpanded ? <FaChevronDown /> : <FaChevronRight />} Messages Library
          </button>
          {isMessageLibraryExpanded && (
            <ul className={styles.nestedList}>
              {messagesWithContent.map((message, index) => (
                <li key={index} className={styles.textLine} onClick={() => handleTextLineClick(message)}>
                  {truncateText(message.content, 30)}
                  <div className={styles.timestampList}>{message.timestamp}</div>
                  <FaAsterisk
                    className={styles.tagIcon}
                    onClick={(e: React.MouseEvent<SVGElement>) => {
                      e.stopPropagation(); // Prevent the parent onClick from triggering
                      handleTagIconClick(message, 'message');
                    }}
                  />
                  <FaTrash 
                    className={styles.messageDelete} 
                    onClick={(e: React.MouseEvent<SVGElement>) => {
                      e.stopPropagation();
                      handleDeleteContent(userId, message.url, 'message')}
                    }
                    title='Delete Message' 
                  />
                  {message.tags && message.tags.map((tag) => (
                    <span key={tag.id} className={styles.messageTag}>
                      {tag.name}
                    </span>
                  ))}
                </li>
              ))}
          </ul>
          )}
        </li>
        <li>
          <button
            className={styles.expandButton}
            onClick={toggleImageLibraryExpand}
          >
            {isImageLibraryExpanded ? <FaChevronDown /> : <FaChevronRight />} Image Library
          </button>
          {isImageLibraryExpanded && (
            <ul className={styles.nestedList}>
              <div className={styles.thumbnailGrid}>
                {transformedImages.map((image: ImageItem, index) => (
                  <div key={index} className={styles.thumbnailContainer}>
                    <a href={image.imageUrl} target="_blank" rel="noopener noreferrer">
                      <Image src={image.thumbnailUrl} alt={`Image ${index + 1}`} width="75" height="75" className={styles.thumbnail} />
                    </a>
                    <FaAsterisk className={styles.tagIcon} onClick={() => handleTagIconClick(image, 'image')} title='Tag Image' />
                    <FaTrash className={styles.imageDelete} onClick={() => handleDeleteContent(userId, image.imageUrl, 'image')} title='Delete Image' />
                    {image.tags.map((tag) => (
                      <span key={tag.id} className={styles.imageTag}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </ul>
          )}
        </li>
        <li>
          <button
            className={styles.expandButton}
            onClick={toggleTagsExpand}
          >
            {isTagsExpanded ? <FaChevronDown /> : <FaChevronRight />} Project Tags
          </button>
          {isTagsExpanded && (
            <ul className={styles.nestedList}>
              <li className={styles.textLine} onClick={createTag}>
                Create New Tag
                <FaPlus style={{ marginLeft: '8px' }} />
              </li>
              {tags.map((tag) => (
                <li key={tag.id} className={styles.textLine} onClick={() => fetchObjectsByTag(tag)}>
                  {tag.name}
                </li>
              ))}
            </ul>
          )}
        </li>
      </ul>
      {isPopupVisible && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => setIsPopupVisible(false)}>
              &times;
            </button>
            <form onSubmit={handleTagSubmit}>
              <h3>Tag Name:</h3>
              <input type="text" id="tagName" value={tagName} onChange={handleTagNameChange} required className={styles.inputField}/>
              <button type="submit" className={styles.submitButton}>Create Tag</button>
            </form>
          </div>
        </div>
      )}
      {isTaggingPopupVisible && ( taggingImage || taggingMessage ) && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => setIsTaggingPopupVisible(false)}>
              &times;
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
              &times;
            </button>
            <h3>{selectedTag.name}</h3>
            <button className={styles.deleteButton} onClick={() => handleDeleteTag(selectedTag.id)}>
              <FaTrash
                title='Delete Tag'
              />
            </button>
            {/* Display messages associated with the tag */}
            <div className={styles.messagesSection}>
              <h4>Messages</h4>
              {messagesWithTag.length > 0 ? (
                <ul className={styles.messagesList}>
                  {messagesWithTag.map((message, index) => (
                    <li key={index} className={styles.popupTextLine} onClick={() => handleTextLineClick(message)}>
                      {truncateText(message.content, 35)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>None</p>
              )}
            </div>
            
            {/* Display images associated with the tag */}
            <div className={styles.thumbnailGridContainer}>
              <h4 className={styles.thumbnailTitle}>Images</h4>
              <div className={styles.thumbnailGrid}>
                {objectsWithTag.length > 0 ? (
                  objectsWithTag.map((image, index) => (
                    <div key={index} className={styles.thumbnailContainer}>
                      <a href={image.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={image.imageUrl} alt={`Image ${index + 1}`} width="75" height="75" className={styles.thumbnail} />
                      </a>
                    </div>
                  ))
                ) : (
                  <p>None</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedMessage && (
        <Draggable
          defaultPosition={initialPosition}
          handle=".drag-handle" // Only the toolbar will be draggable
          onStart={handleDragStart}
        >
          <div className={styles.draggableContainer}>
            <ResizableBox
              className={styles.resizableBox}
              width={boxWidth}
              height={boxHeight}
              minConstraints={[100, 100]}
              maxConstraints={[1000, 600]}
              resizeHandles={['se']}
              onResize={handleResize}
            >
              <div className={styles.messageWindow}>
                {/* Toolbar (drag handle) */}
                <div className={`${styles.toolbar} drag-handle`}>
                  {/* You can add buttons or icons here, like close or minimize */}
                  <button className={styles.closeButton} onClick={handleCloseMessageWindow}>
                    &times;
                  </button>
                  {/* Email button */}
                  <button
                    className={styles.emailButton}
                    onClick={() => {
                      const subject = encodeURIComponent('Message Content');
                      const body = encodeURIComponent(Array.isArray(selectedMessage.content)
                        ? selectedMessage.content.join('')
                        : selectedMessage.content || '');
                    
                      window.location.href = `mailto:?subject=${subject}&body=${body}`;
                    }}
                  >
                    <FaEnvelope />
                  </button>
                  <button
                    className={styles.pdfButton}
                    onClick={() => {
                      const messageContent = Array.isArray(selectedMessage?.content)
                        ? selectedMessage.content.join('')
                        : selectedMessage?.content || '';
                        handleDownloadMessagePDF(messageContent);
                    }}
                  >
                    <FaFilePdf />
                </button>
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.timestampWindow}>{selectedMessage.timestamp}</div>
                  <ReactMarkdown>{selectedMessage.content}</ReactMarkdown>
                </div>
              </div>
            </ResizableBox>
          </div>
        </Draggable>
      )}
    </div>
  );   
};

export default Workspace;