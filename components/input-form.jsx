import React, { useState, useEffect } from 'react';
import { AiOutlineSend, AiOutlineFile, AiOutlinePaperClip, AiOutlineClose } from 'react-icons/ai';
import CinetechSpinner from './message-spinner';
import styles from '@/styles/input-form.module.css';

const InputForm = ({ handleSubmit, handlePromptChange, prompt, isLoading, inputRef, handleFileChange, showLoadingGif }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

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
      setSelectedFile(null); // Clear the file input after submission
      setFilePreview(null); // Clear the file preview after submission
      handleFileChange(null); // Notify the parent component that the file was removed
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    handleFileChange(file); // Pass the file to the parent component
  };

  const triggerFileInput = () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.click();
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    handleFileChange(null); // Notify the parent component that the file was removed
  };

  const onSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting with selectedFile:', selectedFile);
    handleSubmit(e);
    setSelectedFile(null); // Clear the file input after submission
    setFilePreview(null); // Clear the file preview after submission
    console.log('After submission, selectedFile:', selectedFile);
  };

  const renderFilePreview = () => {
    if (filePreview) {
      return (
        <div className="relative">
          <img src={filePreview} alt="File preview" className={`${styles.thumbnail} left-0`} />
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
      <form onSubmit={onSubmit} className={`${styles['input-container']} flex flex-col items-center`}>
        <div className={`${styles['textarea-container']} flex-grow flex flex-col items-center`}>
          {selectedFile && (
            <div className={`${styles['file-preview']} w-full left-0 mb-2 relative`}>
              {renderFilePreview()}
            </div>
          )}
          <div className="flex items-center w-full">
            <AiOutlinePaperClip 
              size={30} 
              className={`${styles['file-attach-button']} mr-2`}
              onClick={triggerFileInput} 
            />
            <textarea
              disabled={isLoading}
              className={`${styles.textarea} border rounded py-2 px-3 text-gray-700 mb-2 resize-none flex-grow`}
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
            <input 
              type="file" 
              id="fileInput" 
              onChange={onFileChange} 
              style={{ display: 'none' }} // Hide the input element
            />
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
        </div>
      </form>
    </div>
  );
};

export default InputForm;
