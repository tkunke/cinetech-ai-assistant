import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Invitation {
  id: string;
  workspaceName: string;
  workspaceId: string;
  ownerName: string;
}

interface UserContextType {
  invitations: Invitation[];
  fetchInvitations: () => void;
  fetchUserStatus: (userId: string) => Promise<void>;
  cancelMembership: (userId: string) => Promise<void>;
  trialExpired: boolean;
  credits: number | undefined;
  // other user-related state and functions
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { data: session } = useSession();  // Use useSession to access session data
  const userId = session?.user?.id;
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [trialExpired, setTrialExpired] = useState<boolean>(false);
  const [credits, setCredits] = useState<number | undefined>(undefined);

  const fetchInvitations = async (userId: string) => {
    try {
      const response = await fetch(`/api/fetchInvitations?userId=${userId}`);
      const data = await response.json();
      console.log('Fetched Invitations:', data);
      setInvitations(data.invitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const fetchUserStatus = async (userId: string) => {
    try {
      const response = await fetch(`/api/checkUser?userId=${userId}&details=true`);
      const data = await response.json();
      //console.log('User Status:', data);
      setTrialExpired(data.trialExpired);
      //console.log('Credits fetched:', data.credits);
      setCredits(data.credits);
    } catch (error) {
      console.error('Error fetching user status:', error);
    }
  };

  const cancelMembership = async (userId: string) => {
    try {
      const response = await fetch('/api/cancelMembership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });
  
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error canceling membership:', error);
      throw error; // Let the caller handle the error
    }
  };  

  useEffect(() => {
    if (userId) {
      fetchInvitations(userId);
      fetchUserStatus(userId);
    }
  }, [userId]);

  const value = {
    invitations,
    fetchInvitations: () => {
      if (session?.user?.id) {
        fetchInvitations(session.user.id);
      }
    },
    fetchUserStatus,
    cancelMembership,
    trialExpired,
    credits,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserProvider;
