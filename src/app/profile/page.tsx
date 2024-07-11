'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const UserProfile = () => {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (session) {
      fetch(`/api/user/${session.user?.id}`)
        .then((response) => response.json())
        .then((data) => setUserData(data));
    }
  }, [session]);

  if (!session) return <p>You need to sign in first</p>;

  return (
    <div>
      <h1>User Profile</h1>
      {userData && (
        <div>
          <p>Email: {userData.email}</p>
          {/* Display other user data */}
        </div>
      )}
    </div>
  );
};

export default UserProfile;
