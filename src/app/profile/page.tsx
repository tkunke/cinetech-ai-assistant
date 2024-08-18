"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const UserProfileSettings = () => {
  const [username, setUsername] = useState('currentUsername'); // Replace with actual data
  const [password, setPassword] = useState('');
  const [assistantName, setAssistantName] = useState('currentAssistantName'); // Replace with actual data
  const [defaultGreeting, setDefaultGreeting] = useState('currentDefaultGreeting'); // Replace with actual data

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/user/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
        assistantName,
        defaultGreeting,
      }),
    });

    if (response.ok) {
      // Handle success (e.g., show a success message)
    } else {
      // Handle the error appropriately, e.g., show an error message to the user
      const data = await response.json();
      alert(data.message);
    }
  };

  const handleBackToAssistant = () => {
    router.push('/assistant'); // Adjust this path as needed
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Profile Settings</h2>
          <button
            onClick={handleBackToAssistant}
            className="group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
          >
            Back to Assistant
          </button>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4 bg-white p-6">
            <h3 className="text-xl font-semibold text-gray-900">Profile Information</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  disabled
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-gray-100"
                  value={username}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-md shadow-sm space-y-4 bg-white p-6">
            <h3 className="text-xl font-semibold text-gray-900">Assistant Settings</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Assistant&apos;s Name</label>
                <input
                  type="text"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Greeting</label>
                <input
                  type="text"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                  value={defaultGreeting}
                  onChange={(e) => setDefaultGreeting(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfileSettings;
