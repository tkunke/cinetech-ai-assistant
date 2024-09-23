import React, { useState, useEffect, useRef, memo } from 'react';
import { useSession } from 'next-auth/react';
import { AiOutlineSend, AiOutlineFile, AiOutlinePaperClip, AiOutlineClose } from 'react-icons/ai';
import CinetechSpinner from './message-spinner';
import styles from '@/styles/input-form.module.css';
import { useUser } from '@/context/UserContext';

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
            disabled={trialExpired || credits <= 0}
          />
          <input 
            type="file" 
            id="fileInput" 
            ref={fileInputRef}
            onChange={onFileChange} 
            style={{ display: 'none' }} // Hide the input element
            disabled={trialExpired || credits <= 0}
          />
          <div className={`${styles['textarea-container']}`}>
            <textarea
              disabled={isLoading || trialExpired || credits <= 0}
              className={`${styles.textarea}`}
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
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          {isLoading || trialExpired || credits <= 0 ? (
            <button
              disabled
              className={`${styles.button} focus:outline-none focus:shadow-outline mb-2`}
            >
              {isLoading ? <CinetechSpinner /> : <AiOutlineSend />}
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
