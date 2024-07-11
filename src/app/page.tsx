"use client";
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

type Orientation = 'portrait' | 'landscape' | null;

const ResponsiveDiv = () => {
  const [orientation, setOrientation] = useState<Orientation>(null);

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
    };
  }, []);

  const handleSignUp = () => {
    // Navigate to the signup page when the signup button is clicked
    window.location.href = '/signup';
  };

  return (
    <div className="page-background">
      {orientation === "landscape" || orientation === "portrait" ? (
        <div>
          <header className="header-homepage">
            <div className="header-content">
              <h1 className="text-cyan-100" style={{ fontFamily: "'Limelight', 'sans-serif'" }}>
                Welcome to the CineTech Assistant
              </h1>
            </div>
          </header>
          <div className="overlay-image-container">
            <Image
              src="/cinetech_art.png"
              alt="Cinetech Logo"
              width="0"
              height="0"
              sizes="100vw"
              className="overlay-image"
            />
            <div className="absolute bottom-12 left-0 w-full h-1/3 flex justify-center" style={{ zIndex: '50'}}>
              <div className="container mx-auto px-4 py-4 flex flex-col items-center">
                <div className="mb-3 md:mb-6">
                  <Link href="/assistant">
                    <button onClick={handleSignUp} className="px-4 md:px-12 py-2 md:py-3 bg-white text-gray-700 text-sm md:text-base rounded-full hover:bg-gray-200 hover:text-gray-900 transition duration-300 ease-in-out">
                      Try the Assistant
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <footer className="footer-homepage">
            <div className="footer-content">
              <h1 className="text-cyan-100" style={{ fontFamily: "'Limelight', 'sans-serif'" }}>
              The CineTech Assistant is designed as an advanced virtual aide for industry professionals and enthusiasts
              </h1>
                <p className="text-cyan-100 font-extrabold" style={{ fontFamily: "'Limelight', 'sans-serif'", fontSize: '1.5rem' }}>
                Already have an account? <a href="/login" className="text-blue-500 underline">Login</a>
                </p>
            </div>
          </footer>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}

export default ResponsiveDiv;
