import React, { useState } from 'react';
import { AiOutlineSend, AiOutlineFile } from 'react-icons/ai';
import CinetechSpinner from './message-spinner';
import styles from '@/styles/input-form.module.css';

const InputForm = ({ handleSubmit, handlePromptChange, prompt, isLoading, inputRef, handleFileChange }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents the default behavior of adding a new line
      handleSubmit(e); // Triggers the form submission
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    handleFileChange(file); // Pass the file to the parent component
  };

  const triggerFileInput = () => {
    console.log("File input trigger called");
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      console.log("File input element found, triggering click");
      fileInput.click();
    } else {
      console.log("File input element not found");
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSubmit(e);
    setSelectedFile(null); // Clear the file input after submission
  };

  return (
    <div className="flex justify-center w-full">
      <form onSubmit={onSubmit} className={`${styles['input-container']} flex flex-col items-center`}>
        <div className={`${styles['textarea-container']} flex-grow flex items-center`}>
          <AiOutlineFile 
            size={30} 
            className={`${styles['file-attach-button']} mr-2`}
            onClick={triggerFileInput} 
          />
          <textarea
            disabled={isLoading}
            className={`${styles.textarea} border rounded py-2 px-3 text-gray-700 mb-2 resize-none`}
            onChange={handlePromptChange}
            value={prompt}
            placeholder="Type your query here..."
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
      </form>
    </div>
  );
};

export default InputForm;