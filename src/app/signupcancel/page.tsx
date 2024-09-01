'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  const handleBackToHome = () => {
    router.push('/'); // Redirects back to the home page or adjust to the desired route
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50">
      <h1 className="text-4xl font-bold text-red-600 mb-4">Payment Canceled</h1>
      <p className="text-lg text-gray-700 mb-8">
        Your payment was not completed. You can continue shopping and try again.
      </p>
      <button
        onClick={handleBackToHome}
        className="px-6 py-2 bg-red-600 text-white text-lg rounded-md hover:bg-red-700"
      >
        Back to Home
      </button>
    </div>
  );
}
