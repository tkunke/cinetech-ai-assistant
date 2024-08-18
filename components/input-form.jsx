import React, { useState, useEffect, useRef, memo } from 'react';
import { AiOutlineSend, AiOutlineFile, AiOutlinePaperClip, AiOutlineClose } from 'react-icons/ai';
import CinetechSpinner from './message-spinner';
import styles from '@/styles/input-form.module.css';

const InputForm = ({ handleSubmit, handlePromptChange, prompt, isLoading, inputRef, handleFileChange }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const fileInputRef = useRef(null);

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
    setSelectedFile(file);
    handleFileChange(file); // Pass the file to the parent component
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeFile = () => {
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
      return (
        <div className="relative">
          <img src={filePreview} alt="File preview" className={`${styles.thumbnail}`} />
          <AiOutlineClose
            size={16}  // Smaller size for the close icon
            className="absolute top-1 right-1 cursor-pointer"
            onClick={removeFile}
            style={{ color: 'red', backgroundColor: 'white', borderRadius: '50%', cursor: 'pointer' }}
          />
        </div>
      );
    } else if (selectedFile) {
      return (
        <div className="relative flex items-center">
          <AiOutlineFile size={40} title={selectedFile.name} />
          <AiOutlineClose
            size={16}  // Smaller size for the close icon
            className="absolute top-1 right-1 cursor-pointer"
            onClick={removeFile}
            style={{ color: 'red', backgroundColor: 'white', borderRadius: '50%', cursor: 'pointer' }}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex justify-center w-full">
      <form onSubmit={onSubmit} className={`${styles['input-container']} flex items-center w-full`}>
        <div className="flex items-center w-full justify-center">
          <AiOutlinePaperClip 
            size={30} 
            className={`${styles['file-attach-button']} mr-2`}
            onClick={triggerFileInput} 
          />
          <input 
            type="file" 
            id="fileInput" 
            ref={fileInputRef}
            onChange={onFileChange} 
            style={{ display: 'none' }} // Hide the input element
          />
          <div className={`${styles['textarea-container']}`}>
            <textarea
              disabled={isLoading}
              className={`${styles.textarea} border rounded py-2 px-3 text-gray-700 mb-2 resize-none`}
              onChange={handlePromptChange}
              value={prompt}
              placeholder="Type your message..."
              ref={inputRef}
              rows="1"
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          {isLoading ? (
            <button
              disabled
              className={`${styles.button} focus:outline-none focus:shadow-outline mb-2`}
            >
              <CinetechSpinner />
            </button>
          ) : (
            <button
              disabled={prompt.length === 0 && !selectedFile}
              className={`${styles.button} focus:outline-none focus:shadow-outline mb-2`}
            >
              <AiOutlineSend />
            </button>
          )}
        </div>
        {showWarning && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            Oops! You forgot to add a message.
          </div>
        )}
        {selectedFile && (
          <div className={`${styles['file-preview']} ml-2`}>
            <div className={styles['file-preview-text']}>Files to upload</div>
            {renderFilePreview()}
          </div>
        )}
      </form>
    </div>
  );
};

export default memo(InputForm);
