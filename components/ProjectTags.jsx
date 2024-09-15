import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import styles from '@/styles/ProjectTags.module.css';
import { useWorkspace } from '@/context/WorkspaceContext';
import { createClient } from '@supabase/supabase-js';
import MessagePopup from '@/components/MessagePopup';

const supabaseUrl = 'https://xeatvqzhnxnxdbxfaduh.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ProjectTags = ({ userId }) => {
  const { activeWorkspaceId } = useWorkspace();
  const [tags, setTags] = useState([]);
  const [hasFetchedTags, setHasFetchedTags] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [isCreateTagPopupVisible, setIsCreateTagPopupVisible] = useState(false);
  const [isTagDetailsPopupVisible, setIsTagDetailsPopupVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [objectsWithTag, setObjectsWithTag] = useState([]);
  const [messagesWithTag, setMessagesWithTag] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const fetchTags = useCallback(async () => {
    if (!userId || !activeWorkspaceId) return;

    try {
      const response = await fetch(`/api/userTags?userId=${userId}&workspaceId=${activeWorkspaceId}`);
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
  }, [userId, activeWorkspaceId]);

  useEffect(() => {
    if (!hasFetchedTags && userId && activeWorkspaceId) {
      fetchTags();
    }
  }, [hasFetchedTags, userId, activeWorkspaceId, fetchTags]);

  // Real-time updates for project tags
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const projectTagChannel = supabase
      .channel(`workspace-${activeWorkspaceId}-tags`)  // Workspace-specific channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_tags', filter: `workspace_id=eq.${activeWorkspaceId}` },
        (payload) => {
          console.log('Real-time tag change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setTags((prevTags) => [...prevTags, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setTags((prevTags) =>
              prevTags.map((tag) =>
                tag.id === payload.new.id ? payload.new : tag
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTags((prevTags) =>
              prevTags.filter((tag) => tag.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectTagChannel);  // Cleanup the subscription on unmount
    };
  }, [activeWorkspaceId]);

  const fetchObjectsByTag = async (tag) => {
    if (!userId || !activeWorkspaceId) return;

    try {
      console.log(`Fetching objects for tag: ${tag.name}`);
      const response = await fetch(`/api/getObjectsByTag?userId=${userId}&workspaceId=${activeWorkspaceId}&tag=${tag.name}`);
      const data = await response.json();

      if (response.ok) {
        console.log('Fetched objects:', data);

        const mappedImages = data.images.map((img) => ({
          imageUrl: img.image_url,
          thumbnailUrl: img.thumbnail_url,
          tags: [],
        }));

        const mappedMessages = await Promise.all(
          data.messages.map(async (msg) => {
            const messageContentResponse = await fetch(msg.message_url);
            const messageContentData = await messageContentResponse.json();
            return {
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

  const createTag = async () => {
    if (!userId || !activeWorkspaceId || !newTagName.trim()) return;

    try {
      const response = await fetch('/api/userTags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          workspaceId: activeWorkspaceId,
          tag: { name: newTagName.trim() },
        }),
      });

      if (response.ok) {
        setNewTagName('');
        setIsCreateTagPopupVisible(false); // Close the create tag popup
      } else {
        console.error('Failed to create tag:', await response.json());
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const deleteTag = async (tagId) => {
    if (!userId || !activeWorkspaceId || !tagId) return;

    try {
      const response = await fetch('/api/userTags', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          workspaceId: activeWorkspaceId,
          tagId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTags(data.tags);
        setSelectedTag(null);
        setIsTagDetailsPopupVisible(false); // Close the tag details popup
      } else {
        console.error('Failed to delete tag:', await response.json());
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
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
        {tags.map((tag) => (
          <li key={tag.id} className={styles.textLine} onClick={() => fetchObjectsByTag(tag)}>
            {tag.name}
          </li>
        ))}
      </ul>

      {isTagDetailsPopupVisible && selectedTag && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => setIsTagDetailsPopupVisible(false)}>
              &times;
            </button>
            <h3>{selectedTag.name}</h3>

            <div className={styles.messagesSection}>
              <h4>Messages</h4>
              {messagesWithTag.length > 0 ? (
                <ul className={styles.messagesList}>
                  {messagesWithTag.map((message, index) => (
                    <li key={index} className={styles.popupTextLine} onClick={() => setSelectedMessage(message)}>
                      {truncateText(message.content, 35)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Tagged messages will show here</p>
              )}
            </div>

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
                    </div>
                  ))
                ) : (
                  <p>Tagged images will show here</p>
                )}
              </div>
            </div>
            <button className={styles.deleteTag} onClick={() => deleteTag(tags.id)}>Delete Tag</button>
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
            <button type="button" className={styles.submitButton} onClick={createTag}>
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
