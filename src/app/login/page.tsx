"use client";

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const LoginPage = () => {
  const { data: session } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // Function to generate a timestamp string
  const generateTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  };

  useEffect(() => {
    if (session) {
      // Fetch the assistant ID after successful login
      fetchAssistantId()
        .then((assistantId) => {
          if (assistantId) {
            // Store assistantId and redirect
            sessionStorage.setItem('assistantId', assistantId);
            router.push(`/assistant?assistantId=${assistantId}`); // Pass assistantId to assistant page
          } else {
            console.error('No assistant found for the user.');
          }
        })
        .catch((error) => {
          console.error('Error fetching assistant:', error);
        });
    }
  }, [session, router]);

  // Function to fetch the assistant ID from the database
  const fetchAssistantId = async () => {
    try {
      const response = await fetch('/api/getAssistantId', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id, // Assuming the session contains user ID
        }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      return data.assistantId; // Return the assistant ID
    } catch (error) {
      console.error('Error fetching assistant ID:', error);
      throw error;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      console.error('Sign in failed:', result.error);
      alert('Sign in failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none"
          >
            Sign In
          </button>
        </form>
        {!session && (
          <div className="text-center">
            <p>Don&apos;t have an account? <a href="/signup" className="text-cyan-600 hover:text-cyan-500">Sign up</a></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
