'use client';

import React, { useEffect, useState } from 'react';
import styles from '@/styles/faq.module.css';

interface FAQSection {
  heading: string;
  questions: { question: string; answer: string }[];
}

const FAQ = () => {
  const [faqData, setFaqData] = useState<Record<string, FAQSection> | null>(null);

  useEffect(() => {
    // Fetch the FAQ content from the JSON file
    fetch('/faqContent.json')
      .then((response) => response.json())
      .then((data) => setFaqData(data))
      .catch((error) => console.error('Error fetching FAQ data:', error));
  }, []);

  if (!faqData) {
    return <div>Loading FAQ...</div>;
  }

  return (
    <div className={styles.faqContainer}>
      <h1 className={styles.faqTitle}>Frequently Asked Questions</h1>
      {Object.entries(faqData).map(([key, section]) => (
        <section key={key} className={styles.faqSection}>
          <h2 className={styles.sectionHeading}>{section.heading}</h2>
          {section.questions.map((q, index) => (
            <div key={index}>
              <h3 className={styles.question}>{q.question}</h3>
              <p className={styles.answer}>{q.answer}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
};

export default FAQ;
