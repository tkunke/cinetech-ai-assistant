import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Member {
  email: string;
  username: string;
  role: 'viewer' | 'editor';
  status: 'pending' | 'confirmed';
}

interface Workspace {
  id: string;
  name: string;
  sharedWith: string[];
  type: 'private' | 'public';
  messages: any[];
  images: any[];
  tags: any[];
  members: Member[];
}

export interface WorkspaceDetails {
  name: string;
  owner: string;
  members: { email: string; role: 'viewer' | 'editor' }[];
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  createWorkspace: (workspaceDetails: WorkspaceDetails) => void;
  addMemberToWorkspace: (workspaceId: string, member: { email: string; role: 'viewer' | 'editor' }) => void;
  deleteWorkspace: (id: string) => void;
  switchWorkspace: (id: string) => void;
  getActiveWorkspace: () => Workspace | null;
  fetchWorkspaceMembers: (workspaceId: string, userId: string) => Promise<"viewer" | "editor" | "owner" | null>;
  userRole: 'viewer' | 'editor' | 'owner' | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const userId = session?.user?.id || '';
  const firstName = session?.user?.first_name || session?.user?.name || 'My';

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'viewer' | 'editor' | 'owner' | null>(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await fetch(`/api/workspaceHandler?userId=${userId}`);
        const data = await response.json();
  
        if (response.ok && data.workspaces.length > 0) {
          setWorkspaces(data.workspaces);
  
          // Find the private "My Workspace" and set it as active
          const privateWorkspace = data.workspaces.find((ws: Workspace) => ws.name === 'My Workspace');
          setActiveWorkspaceId(privateWorkspace?.id || data.workspaces[0].id);
        } else {
          setWorkspaces([]);
        }
      } catch (error) {
        console.error('Error fetching workspaces:', error);
        setWorkspaces([]);
      }
    };
  
    if (userId && status === 'authenticated') {
      fetchWorkspaces();
    }
  }, [userId, status]);

  useEffect(() => {
    if (activeWorkspaceId && userId) {
      // Clear the previous role state before fetching new role
      setUserRole(null);
  
      fetchWorkspaceMembers(activeWorkspaceId, userId)
        .then((role) => {
          setUserRole(role); // Set the role state with the returned value
          console.log('Set user role:', role);
        })
        .catch((error) => {
          console.error('Failed to fetch workspace members:', error);
        });
    }
  }, [activeWorkspaceId, userId]);  


  const createWorkspace = async (workspaceDetails: WorkspaceDetails) => {
    const { name, owner, members } = workspaceDetails;
  
    try {
      const response = await fetch('/api/workspaceHandler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: owner, name, members, type: 'public' }),
      });
  
      if (response.ok) {
        const data = await response.json();
        
        // Ensure the newly created workspace is added to the state
        setWorkspaces((prevWorkspaces) => [...prevWorkspaces, data.workspace]);
  
        // Set the newly created workspace as active
        setActiveWorkspaceId(data.workspace.id);
      } else {
        const errorData = await response.json();
        console.error('Error creating workspace:', errorData.message);
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  const addMemberToWorkspace = async (workspaceId: string, member: { email: string; role: 'viewer' | 'editor' }) => {
    try {
      const response = await fetch('/api/workspaceHandler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceId, member }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update the workspace state with the new member
        setWorkspaces((prevWorkspaces) =>
          prevWorkspaces.map((workspace) =>
            workspace.id === workspaceId
              ? { ...workspace, members: [...workspace.members, data.member] }
              : workspace
          )
        );
      } else {
        console.error('Error adding member to workspace:', await response.json());
      }
    } catch (error) {
      console.error('Error adding member to workspace:', error);
    }
  };

  const fetchWorkspaceMembers = async (workspaceId: string, userId: string): Promise<"viewer" | "editor" | "owner" | null> => {
    try {
      const response = await fetch(`/api/workspaceMembers?workspaceId=${workspaceId}&userId=${userId}`);
      const data = await response.json();
  
      if (response.ok && data.role) {
        return data.role; // Return the role directly
      } else {
        console.error('Error fetching workspace members:', data.message);
        return null; // Return null if there's an issue
      }
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      return null; // Return null on error
    }
  };  

  const deleteWorkspace = (id: string) => {
    setWorkspaces((prevWorkspaces) => prevWorkspaces.filter((workspace) => workspace.id !== id));
    if (id === activeWorkspaceId) {
      setActiveWorkspaceId(null);
    }
  };

  const switchWorkspace = (id: string) => {
    setActiveWorkspaceId(id);
  };

  const getActiveWorkspace = (): Workspace | null => {
    return workspaces.find((workspace) => workspace.id === activeWorkspaceId) || null;
  };

  const value = {
    workspaces,
    activeWorkspaceId,
    createWorkspace,
    addMemberToWorkspace,
    deleteWorkspace,
    switchWorkspace,
    getActiveWorkspace,
    fetchWorkspaceMembers,
    userRole,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export default WorkspaceProvider;
