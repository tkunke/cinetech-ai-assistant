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
  trialExpired: boolean;
  credits: number;
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
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [trialExpired, setTrialExpired] = useState<boolean>(false);
  const [credits, setCredits] = useState<number>(0);

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
      const response = await fetch(`/api/checkUser?userId=${userId}`);
      const data = await response.json();
      setTrialExpired(data.trialExpired);
      setCredits(data.credits);
    } catch (error) {
      console.error('Error fetching user status:', error);
    }
  };

  useEffect(() => {
    // Fetch invitations whenever the user logs in
    const userId = session?.user?.id;
    if (userId) {
      fetchInvitations(userId);
      fetchUserStatus(userId);
    }
  }, [session?.user?.id]);

  const value = {
    invitations,
    fetchInvitations: () => {
      if (session?.user?.id) {
        fetchInvitations(session.user.id);
      }
    },
    fetchUserStatus,
    trialExpired,
    credits,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserProvider;
