import React, { useState, useEffect, useRef, memo } from 'react';
import { useSession } from 'next-auth/react';
import { AiOutlineSend, AiOutlineFile, AiOutlinePaperClip, AiOutlineClose } from 'react-icons/ai';
import CinetechSpinner from './message-spinner';
import styles from '@/styles/input-form.module.css';
import { useUser } from '@/context/UserContext';
import { FaFilePdf, FaFileWord, FaFileAlt } from 'react-icons/fa';

const InputForm = ({ handleSubmit, handlePromptChange, prompt, isLoading, inputRef, handleFileChange }) => {
  const { data: session } = useSession();
  const username = session?.user?.name || 'user';
  const { trialExpired, credits } = useUser();
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    console.log('Current credits:', credits);
  }, [credits]);  
  
  useEffect(() => {
    if (fileInputRef.current) {
    }
  }, [fileInputRef]);

  useEffect(() => {
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        const fileURL = URL.createObjectURL(selectedFile);
        setFilePreview(fileURL);
        return () => URL.revokeObjectURL(fileURL);
      } else {
        setFilePreview(null);
      }
    }
  }, [selectedFile]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents the default behavior of adding a new line
      handleSubmit(e); // Triggers the form submission
      resetFileInput(); // Reset the file input
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
  
    // Prepend the username to the file name
    const updatedFileName = `${username}-${file.name}`;
  
    // Create a new file with the updated name
    const updatedFile = new File([file], updatedFileName, {
      type: file.type,
    });
  
    setSelectedFile(updatedFile);
    handleFileChange(updatedFile); // Pass the updated file to the parent component
  };  

  const triggerFileInput = () => {
    console.log('Attempting to trigger file input');
    if (fileInputRef.current) {
      console.log('File input exists, triggering click');
      fileInputRef.current.click();
    } else {
      console.error('File input ref is null');
    }
  };

  const removeFile = () => {
    console.log('File removed');
    resetFileInput(); // Reset the file input so the same file can be re-added
    handleFileChange(null); // Notify the parent component that the file was removed
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedFile(null);
    setFilePreview(null);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (prompt.length === 0 && selectedFile) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000); // Hide the warning after 3 seconds
    } else {
      console.log('Submitting with selectedFile:', selectedFile);
      handleSubmit(e);
      resetFileInput(); // Reset the file input
    }
  };

  const renderFilePreview = () => {
    if (filePreview) {
      // Render the image preview for image files
      return (
        <div className={styles.filePreviewInside}>
          <img src={filePreview} alt="File preview" className={styles.thumbnail} />
          <AiOutlineClose
            size={16}
            className={styles.closeIconInside}
            onClick={removeFile}
          />
        </div>
      );
    } else if (selectedFile) {
      let FileIcon;

      // Set the appropriate icon based on the file type
      if (selectedFile.type === 'application/pdf') {
        FileIcon = <FaFilePdf size={70} color="gray" />;
      } else if (selectedFile.type === 'application/msword' || selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        FileIcon = <FaFileWord size={70} color="gray" />;
      } else {
        FileIcon = <FaFileAlt size={70} color="gray" />;
      }
      return (
        <div className={styles.filePreviewInside}>
          {FileIcon}
          <AiOutlineClose
            size={16}
            className={styles.closeIconInside}
            onClick={removeFile}
          />
        </div>
      );
    }
    return null;
  };  

  return (
    <div className={styles.flexContainer}>
      <form onSubmit={onSubmit} className={styles.inputContainer}>
        <div className={styles.flexItems}>
          <AiOutlinePaperClip 
            size={30} 
            className={styles.fileAttachButton}
            onClick={triggerFileInput}
            disabled={trialExpired || credits <= 0}
          />
          <input 
            type="file" 
            id="fileInput" 
            ref={fileInputRef}
            onChange={onFileChange} 
            className={styles.hiddenInput}
            disabled={trialExpired || credits <= 0}
          />
          
          <div className={styles.textAreaContainer}>
            <div className={styles.textAreaWrapper}>
            {renderFilePreview()}
              <textarea
                disabled={isLoading || trialExpired || credits <= 0}
                className={`${styles.textArea} ${selectedFile ? `${styles.withFile} ${styles.expandedTextArea}` : ''}`}
                onChange={handlePromptChange}
                value={prompt}
                placeholder={
                  trialExpired 
                    ? "Your trial has expired."
                    : credits <= 0 
                      ? "You've exhausted your available credits."
                      : "Start typing here..."
                }              
                ref={inputRef}
                rows="1"
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  const minHeight = selectedFile ? '5.5rem' : '3rem';
                  e.target.style.height = `${Math.max(e.target.scrollHeight, parseInt(minHeight))}px`;
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
          
          <button
            disabled={prompt.length === 0 && !selectedFile}
            className={styles.button}
          >
            {isLoading ? <CinetechSpinner /> : <AiOutlineSend />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default memo(InputForm);
