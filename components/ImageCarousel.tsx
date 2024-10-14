import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from '@/styles/ImageCarousel.module.css';

const ImageCarousel: React.FC = () => {
  const [currentImage, setCurrentImage] = useState(0);

  const images = [
    '/colloseum_sketch.png',
    '/colloseum_updated.png',
    '/intersection_sketch.jpg',
    '/intersection_updated.png',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prevImage) => (prevImage + 1) % images.length); // Loop through images
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [images.length]);

  return (
    <div className={styles.mediaContainer}>
      <h2>Powerful Image Generation</h2>
      <div className={styles.imageWrapper}>
        <Image
          src={images[currentImage]}
          alt="Image generation concepts"
          width={400}
          height={400}
          className={styles.fadeImage}
        />
      </div>
    </div>
  );
};

export default ImageCarousel;
