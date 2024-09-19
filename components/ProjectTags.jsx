import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaSave, FaEdit } from 'react-icons/fa';
import styles from '@/styles/ProjectTags.module.css';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useLibrary } from '@/context/LibraryContext';
import MessagePopup from '@/components/MessagePopup';

const ProjectTags = ({ userId }) => {
  const { activeWorkspaceId } = useWorkspace();
  const { fetchedTags, fetchTags, createTag, deleteTag, updateTag, untagContent } = useLibrary(); // Use tag management from LibraryContext
  const [selectedTag, setSelectedTag] = useState(null);
  const [isCreateTagPopupVisible, setIsCreateTagPopupVisible] = useState(false);
  const [isTagDetailsPopupVisible, setIsTagDetailsPopupVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isEditingTagName, setIsEditingTagName] = useState(false);
  const [objectsWithTag, setObjectsWithTag] = useState([]);
  const [messagesWithTag, setMessagesWithTag] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    if (userId && activeWorkspaceId) {
      console.log('Fetching tags for workspace:', activeWorkspaceId);
      fetchTags(userId, activeWorkspaceId); // Fetch tags using centralized state
    }
  }, [userId, activeWorkspaceId, fetchTags]);

  const fetchObjectsByTag = async (tag) => {
    if (!userId || !activeWorkspaceId) return;

    try {
      const response = await fetch(`/api/getObjectsByTag?userId=${userId}&workspaceId=${activeWorkspaceId}&tag=${tag.name}`);
      const data = await response.json();

      if (response.ok) {
        const mappedImages = data.images.map((img) => ({
          id: img.id,
          imageUrl: img.image_url,
          thumbnailUrl: img.thumbnail_url,
          tags: [],
        }));

        const mappedMessages = await Promise.all(
          data.messages.map(async (msg) => {
            const messageContentResponse = await fetch(msg.message_url);
            const messageContentData = await messageContentResponse.json();
            return {
              id: msg.id,
              url: msg.message_url,
              timestamp: msg.timestamp,
              content: messageContentData.content || '',
              tags: [],
            };
          })
        );

        setObjectsWithTag(mappedImages);
        setMessagesWithTag(mappedMessages);
        setSelectedTag(tag);
        setIsTagDetailsPopupVisible(true); // Open the tag details popup
      } else {
        console.error('Failed to fetch objects:', data.error);
      }
    } catch (error) {
      console.error('Error fetching objects by tag:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!userId || !activeWorkspaceId || !newTagName.trim()) return;

    await createTag(userId, activeWorkspaceId, newTagName); // Use the createTag function from context
    setNewTagName('');
    setIsCreateTagPopupVisible(false); // Close the create tag popup
  };

  const handleDeleteTag = async (tagId) => {
    if (!userId || !activeWorkspaceId || !tagId) return;

    await deleteTag(userId, activeWorkspaceId, tagId); // Use the deleteTag function from context
    setSelectedTag(null);
    setIsTagDetailsPopupVisible(false); // Close the tag details popup
  };

  const handleRenameTag = () => {
    setIsEditingTagName(true);
    setNewTagName(selectedTag.name);
  };

  const handleSaveTagName = async () => {
    if (!newTagName.trim() || !selectedTag) return;

    await updateTag(userId, activeWorkspaceId, selectedTag.id, newTagName); // Call updateTag function
    setSelectedTag({ ...selectedTag, name: newTagName }); // Update the selected tag locally
    setIsEditingTagName(false); // Exit edit mode
  };

  const handleUntag = async (contentId, contentType) => {
    try {
      console.log('Attempting to untag content:', {
        contentId,
        contentType,
        tagId: selectedTag.id
      });

      // Send the untag request to the server
      const response = await untagContent(contentId, selectedTag.id, contentType);
      
      if (response.ok) {
        console.log('Untagging successful, updating UI');
        
        // After untagging, update the UI by removing the item from the list
        if (contentType === 'image') {
          console.log('Previous images state:', objectsWithTag);
          setObjectsWithTag(prevObjects => {
            const updatedObjects = prevObjects.filter(image => image.id !== contentId);
            console.log('Updated images state:', updatedObjects); // Log updated state
            return updatedObjects;
          });
        } else if (contentType === 'message') {
          console.log('Previous messages state:', messagesWithTag);
          setMessagesWithTag(prevMessages => {
            const updatedMessages = prevMessages.filter(message => message.id !== contentId);
            console.log('Updated messages state:', updatedMessages); // Log updated state
            return updatedMessages;
          });
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to untag content:', errorData);
      }
    } catch (error) {
      console.error('Failed to untag content (exception caught):', error);
    }
  }; 

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div>
      {/* Add Tag Button */}
      <button className={styles.addTagButton} onClick={() => setIsCreateTagPopupVisible(true)}>
        <FaPlus title="Create New Tag" />
      </button>
      <ul className={styles.nestedList}>
        {fetchedTags && fetchedTags.length > 0 ? (
          fetchedTags.map((tag) => (
            <li key={tag.id} className={styles.textLine} onClick={() => fetchObjectsByTag(tag)}>
              {tag.name}
            </li>
          ))
        ) : (
          <li>No tags available</li>
        )}
      </ul>

      {isTagDetailsPopupVisible && selectedTag && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => setIsTagDetailsPopupVisible(false)}>
              &times;
            </button>

            <div className={styles.tagHeader}>
              {isEditingTagName ? (
                <>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Rename Tag"
                    className={styles.inputField}
                  />
                  <button className={styles.saveButton} onClick={handleSaveTagName}>
                    <FaSave />
                  </button>
                </>
              ) : (
                <div className={styles.tagNameWrapper}>
                  <h3 className={styles.tagName}>{selectedTag.name}</h3>
                  <button className={styles.editButton} onClick={handleRenameTag}>
                    <FaEdit />
                  </button>
                </div>
              )}
            </div>
            
            {/* Messages Section */}
            <div className={styles.messagesSection}>
              <h4>Messages</h4>
              {messagesWithTag.length > 0 ? (
                <ul className={styles.messagesList}>
                  {messagesWithTag.map((message, index) => (
                    <li key={index} className={styles.popupTextLine}>
                      <span onClick={() => setSelectedMessage(message)}>
                        {truncateText(message.content, 35)}
                      </span>
                      {console.log('Message ID:', message.id)}
                      {/* 'X' to untag message */}
                      <button className={styles.untagButton} onClick={() => handleUntag(message.id, 'message')}>
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Tagged messages will show here</p>
              )}
            </div>
            
            {/* Images Section */}
            <div className={styles.thumbnailGridContainer}>
              <h4 className={styles.thumbnailTitle}>Images</h4>
              <div className={styles.thumbnailGrid}>
                {objectsWithTag.length > 0 ? (
                  objectsWithTag.map((image, index) => (
                    <div key={index} className={styles.thumbnailContainer}>
                      <a href={image.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={image.thumbnailUrl}
                          alt={`Image ${index + 1}`}
                          width="75"
                          height="75"
                          className={styles.thumbnail}
                        />
                      </a>
                      {/* 'X' to untag image */}
                      <button className={styles.untagButton} onClick={() => handleUntag(image.id, 'image')}>
                        &times;
                      </button>
                    </div>
                  ))
                ) : (
                  <p>Tagged images will show here</p>
                )}
              </div>
            </div>
              
            <button className={styles.deleteTag} onClick={() => handleDeleteTag(selectedTag.id)}>Delete Tag</button>
          </div>
        </div>
      )}

      {/* Create Tag Popup */}
      {isCreateTagPopupVisible && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => setIsCreateTagPopupVisible(false)}>
              &times;
            </button>
            <h3>Create New Project Tag</h3>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag Name"
              required
              className={styles.inputField}
            />
            <button type="button" className={styles.submitButton} onClick={handleCreateTag}>
              Create
            </button>
          </div>
        </div>
      )}
      {selectedMessage && (
        <MessagePopup 
          message={selectedMessage} 
          onClose={() => setSelectedMessage(null)} 
        />
      )}
    </div>
  );
};

export default ProjectTags;
