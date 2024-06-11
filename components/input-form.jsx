import React from 'react';
import { AiOutlineSend } from 'react-icons/ai';
import CinetechSpinner from './message-spinner';
import styles from '../styles/input-form.module.css';

const InputForm = ({ handleSubmit, handlePromptChange, prompt, isLoading, inputRef }) => {
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents the default behavior of adding a new line
      handleSubmit(e); // Triggers the form submission
    }
  };

  return (
    <div className="flex justify-center w-full">
      <form onSubmit={handleSubmit} className={`${styles['input-container']} flex flex-col items-center`}>
        <div className={`${styles['textarea-container']} flex-grow`}>
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
            onKeyDown={handleKeyDown} // Add this line
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
              disabled={prompt.length === 0}
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
