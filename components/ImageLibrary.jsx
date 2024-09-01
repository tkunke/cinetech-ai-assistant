import React, { useEffect, useState } from 'react';
import { FaAsterisk, FaTrash } from 'react-icons/fa';
import Image from 'next/image';
import styles from '@/styles/ImageLibrary.module.css';
import { useLibrary } from '@/context/LibraryContext';
import { useWorkspace } from '@/context/WorkspaceContext';

const ImageLibrary = ({ userId, onTagIconClick }) => {
  const { fetchedImages, fetchImages, removeImage } = useLibrary();
  const { activeWorkspaceId } = useWorkspace();
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [currentImageToDelete, setCurrentImageToDelete] = useState(null);
  const [showTagPopup, setShowTagPopup] = useState(false);
  const [availableTags, setAvailableTags] = useState([]); // Store available tags
  const [currentImageForTagging, setCurrentImageForTagging] = useState(null); // Store the image being tagged

  useEffect(() => {
    if (userId && activeWorkspaceId) {
      fetchImages(userId, activeWorkspaceId);
    }
  }, [userId, activeWorkspaceId, fetchImages]);

  const handleTagIconClick = async (image) => {
    setCurrentImageForTagging(image);

    try {
      const response = await fetch(`/api/userTags?userId=${encodeURIComponent(userId)}&workspaceId=${encodeURIComponent(activeWorkspaceId)}`);
      const data = await response.json();

      if (response.ok) {
        setAvailableTags(data.tags); // Set available tags from the response
        setShowTagPopup(true); // Show the tag popup
      } else {
        console.error('Failed to fetch tags:', data.error);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleDeleteImageContent = async (userId, imageId, imageUrl) => {
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
        setCurrentImageToDelete({ userId, imageId, imageUrl });
        return;
      }

      setCurrentImageToDelete({ userId, imageId, imageUrl });
      await handleConfirmDeleteImage(userId, imageId, imageUrl);

    } catch (error) {
      console.error('Error checking tags:', error);
    }
  };

  const handleConfirmDeleteImage = async () => {
    if (!currentImageToDelete) return;
    const { userId, imageId, imageUrl } = currentImageToDelete;

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
        body: JSON.stringify({ userId, contentUrl: imageUrl, type: 'image' }),
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

  return (
    <>
      <div className={styles.thumbnailGrid}>
        {fetchedImages.map((image, index) => (
          <div key={index} className={styles.thumbnailContainer}>
            <a href={image.imageUrl} target="_blank" rel="noopener noreferrer">
              <Image
                src={image.thumbnailUrl}
                alt={`Image ${index + 1}`}
                width="75"
                height="75"
                className={styles.thumbnail}
              />
            </a>
            <FaAsterisk
              className={styles.tagIcon}
              onClick={() => handleTagIconClick(image)} // Call handleTagIconClick on tag icon click
              title="Tag Image"
            />
            <FaTrash
              className={styles.imageDelete}
              onClick={() => handleDeleteImageContent(userId, image.id, image.imageUrl)}
              title="Delete Image"
            />
            {image.tags?.map((tag) => (
              <span key={tag.id} className={styles.imageTag}>
                {tag.name}
              </span>
            ))}
          </div>
        ))}
      </div>

      {showTagPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <h3>Select a Tag</h3>
            <ul>
              {availableTags.map((tag) => (
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
