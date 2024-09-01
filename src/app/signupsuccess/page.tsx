'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function SuccessPage() {
  const router = useRouter();

  const handleBackToHome = () => {
    router.push('/'); // Redirects back to the home page or adjust to the desired route
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
      <h1 className="text-4xl font-bold text-green-600 mb-4">Payment Successful!</h1>
      <p className="text-lg text-gray-700 mb-8">
        Thank you for your purchase. You will receive a confirmation email shortly.
      </p>
      <button
        onClick={handleBackToHome}
        className="px-6 py-2 bg-green-600 text-white text-lg rounded-md hover:bg-green-700"
      >
        Back to Home
      </button>
    </div>
  );
}
