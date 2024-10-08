import React, { useEffect, useState } from 'react';
import { FaAsterisk, FaTrash } from 'react-icons/fa';
import Image from 'next/image';
import styles from '@/styles/ImageLibrary.module.css';
import { useLibrary } from '@/context/LibraryContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import MessagePopup from '@/components/MessagePopup';

const ImageLibrary = ({ userId, onTagIconClick }) => {
  const { fetchedImages, fetchImages, fetchedTags, removeImage } = useLibrary();
  const { activeWorkspaceId, fetchWorkspaceMembers, userRole } = useWorkspace();
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [currentImageToDelete, setCurrentImageToDelete] = useState(null);
  const [showTagPopup, setShowTagPopup] = useState(false);
  const [currentImageForTagging, setCurrentImageForTagging] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [popupData, setPopupData] = useState(null);

  useEffect(() => {
    if (userId && activeWorkspaceId) {
      fetchImages(activeWorkspaceId);
    }
  }, [userId, activeWorkspaceId, fetchImages]);

  useEffect(() => {
    if (activeWorkspaceId && userId) {
      fetchWorkspaceMembers(activeWorkspaceId, userId);
      console.log('Users role:', userRole);
    }
  }, [activeWorkspaceId, userId]);

  const handleTagIconClick = (image) => {
    setCurrentImageForTagging(image);
  
    if (fetchedTags.length > 0) {
      // If tags are already fetched and available in the context, open the tag popup
      setShowTagPopup(true);
    } else {
      console.error("No tags available to display.");
    }
  };  

  const handleDeleteImageContent = async (userId, imageId, imageUrl, activeWorkspaceId) => {
    try {
      const checkTagsResponse = await fetch('/api/checkTagsInJoinTables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId }),
      });

      const checkTagsResult = await checkTagsResponse.json();

      if (checkTagsResult.imageTags) {
        setShowConfirmationPopup(true);
        setCurrentImageToDelete({ userId, imageId, imageUrl, activeWorkspaceId });
        return;
      }

      setCurrentImageToDelete({ userId, imageId, imageUrl, activeWorkspaceId });
      await handleConfirmDeleteImage(userId, imageId, imageUrl, activeWorkspaceId);

    } catch (error) {
      console.error('Error checking tags:', error);
    }
  };

  const handleConfirmDeleteImage = async () => {
    if (!currentImageToDelete) return;
    const { userId, imageId, imageUrl, activeWorkspaceId } = currentImageToDelete;

    try {
      const removeTagsResponse = await fetch('/api/removeTagsFromJoinTables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId }),
      });

      if (!removeTagsResponse.ok) {
        const errorResult = await removeTagsResponse.json();
        console.error('Failed to remove tag associations:', errorResult.error);
        return;
      }

      const dbResponse = await fetch('/api/saveToPg', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, workspaceId: activeWorkspaceId, contentUrl: imageUrl, type: 'image' }),
      });

      if (dbResponse.ok) {
        const blobResponse = await fetch(`/api/image-store?url=${encodeURIComponent(imageUrl)}&userId=${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        });

        if (blobResponse.ok) {
          removeImage(imageUrl);
        } else {
          const errorResult = await blobResponse.json();
          console.error('Failed to delete file from blob storage:', errorResult.error);
        }
      } else {
        const result = await dbResponse.json();
        console.error('Failed to delete metadata:', result.error);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }

    setShowConfirmationPopup(false);
    setCurrentImageToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowConfirmationPopup(false);
    setCurrentImageToDelete(null);
  };

  const handleApplyTag = async (tagId) => {
    if (!currentImageForTagging) return;

    try {
      const response = await fetch('/api/userTags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          workspaceId: activeWorkspaceId,
          imageUrl: currentImageForTagging.imageUrl,
          tag: { id: tagId },
        }),
      });

      if (response.ok) {
        console.log(`Tag applied successfully to image ${currentImageForTagging.id}`);
        setShowTagPopup(false);
        setCurrentImageForTagging(null);
      } else {
        console.error('Failed to apply tag');
      }
    } catch (error) {
      console.error('Error applying tag:', error);
    }
  };

  const handleCancelTagging = () => {
    setShowTagPopup(false);
    setCurrentImageForTagging(null);
  };

  const handleImageClick = (image) => {
    setPopupData({
      isImagePopup: true, // Set this to true for image popup
      imageUrl: image.thumbnailUrl,
      imageId: image.id,
      onClose: () => setPopupData(null) // Close the popup when done
    });
    console.log('Popup Data:', popupData);
  };

  return (
    <>
      <div className={styles.thumbnailGrid}>
        {fetchedImages.map((image, index) => (
          <div key={index} className={styles.thumbnailContainer}>
            <a onClick={() => handleImageClick(image)} href="#" className={styles.thumbnailLink}>
              <Image
                src={image.thumbnailUrl}
                alt={`Image ${index + 1}`}
                width="75"
                height="75"
                className={styles.thumbnail}
              />
            </a>
            {userRole !== 'viewer' && (
              <button title="Tag Image" className={styles.tagIcon} onClick={() => handleTagIconClick(image)}></button>
            )}
            {image.tags?.map((tag) => (
              <span key={tag.id} className={styles.imageTag}>
                {tag.name}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Show image popup when an image is clicked */}
      {popupData && (
        <MessagePopup
          isImagePopup={popupData.isImagePopup}
          imageUrl={popupData.imageUrl}
          contentId={popupData.imageId}
          onClose={popupData.onClose}
          workspaceId={activeWorkspaceId}
          type="image"
        />
      )}

      {showTagPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <h3>Select a Tag</h3>
            <ul>
              {fetchedTags.map((tag) => (
                <li key={tag.id}>
                  <button onClick={() => handleApplyTag(tag.id)}>{tag.name}</button>
                </li>
              ))}
            </ul>
            <button className={styles.cancelButton} onClick={handleCancelTagging}>Cancel</button>
          </div>
        </div>
      )}

      {showConfirmationPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <h3 className={styles.popupTitle}>Confirm Deletion</h3>
            <p className={styles.popupMessage}>This image is associated with one or more tags. Are you sure you want to delete it?</p>
            <div className={styles.popupButtons}>
              <button className={styles.confirmButton} onClick={handleConfirmDeleteImage}>
                Yes, Delete
              </button>
              <button className={styles.cancelButton} onClick={handleCancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageLibrary;
