import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Member {
  email?: string;
  username?: string;
  role: 'viewer' | 'contributor' | 'owner';
  status?: 'pending' | 'confirmed';
  userId?: string;
}

interface AddableMember {
  email?: string;
  username?: string;
  role: 'viewer' | 'contributor';  // Only allow these two roles
}

interface Workspace {
  id: string;
  name: string;
  type: 'private' | 'public';
  members: Member[];
  owner: Member;
}

export interface WorkspaceDetails {
  name: string;
  owner: string;
  members: { email: string; role: 'viewer' | 'contributor' | 'owner' }[];
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  createWorkspace: (workspaceDetails: WorkspaceDetails) => Promise<string | null>;
  addMember: (workspaceId: string, member: AddableMember) => void;
  deleteWorkspace: (id: string) => void;
  switchWorkspace: (id: string) => void;
  getActiveWorkspace: () => Workspace | null;
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspaceMembers: (workspaceId: string, userId: string) => Promise<{ members: Member[], role: "viewer" | "contributor" | "owner" | null }>;
  fetchAllWorkspaceMembers: (userId: string) => Promise<void>;
  userRole: 'viewer' | 'contributor' | 'owner' | null;
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  setUserRole: React.Dispatch<React.SetStateAction<'viewer' | 'contributor' | 'owner' | null>>;
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
  const [userRole, setUserRole] = useState<'viewer' | 'contributor' | 'owner' | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch(`/api/workspaceHandler?userId=${userId}`);
      const data = await response.json();

      if (response.ok && data.workspaces.length > 0) {
        setWorkspaces(data.workspaces);
        console.log('Workspaces available:', data.workspaces);

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

  useEffect(() => {
    if (userId && status === 'authenticated') {
      fetchWorkspaces();
    }
  }, [userId, status]);

  const createWorkspace = async (workspaceDetails: { name: string; owner: string }): Promise<string | null> => {
    try {
      const response = await fetch('/api/workspaceHandler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: workspaceDetails.owner,
          name: workspaceDetails.name,
          type: 'public', // Assume workspaces are public by default
          members: [], // No members added initially
        }),
      });
  
      if (response.ok) {
        const data = await response.json();
        const newWorkspaceId = data.workspace.id;

        setWorkspaces((prevWorkspaces) => [
          ...prevWorkspaces,
          {
            id: newWorkspaceId,
            name: workspaceDetails.name,
            type: 'public',
            members: [],
            owner: {
              email: session?.user?.email || '', // Assuming the owner is the current user
              username: session?.user?.name || '',
              role: 'owner',
              status: 'confirmed',
              userId: workspaceDetails.owner // The owner's userId
            },
          },
        ]);
        
        return newWorkspaceId || null; // Return the ID of the newly created workspace
      } else {
        console.error('Error creating workspace');
        return null; // Return null in case of an error
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      return null; // Return null in case of an error
    }
  };  

  const addMember = async (workspaceId: string, member: AddableMember) => {
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

  const fetchWorkspaceMembers = async (workspaceId: string, userId: string): Promise<{ members: Member[], role: "viewer" | "contributor" | "owner" | null }> => {
    try {
      const response = await fetch(`/api/workspaceMembers?workspaceId=${workspaceId}&userId=${userId}`);
      const data = await response.json();
  
      if (response.ok && data.members) {
        console.log("API response data:", data);
  
        // Check for the user's role within the members list
        const currentUserRole = data.members.find((member: Member) => member.userId === userId)?.role || null;
  
        return {
          members: data.members,  // The list of members
          role: currentUserRole   // The role of the current user
        };
      } else {
        console.error('Error fetching workspace members:', data.message);
        return { members: [], role: null }; // Return empty members list and null role in case of error
      }
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      return { members: [], role: null }; // Handle errors gracefully
    }
  };

  const fetchAllWorkspaceMembers = async (userId: string) => {
    try {
      const allMembers = await Promise.all(
        workspaces.map(async (workspace) => {
          const { members, role } = await fetchWorkspaceMembers(workspace.id, userId);
          return { workspaceId: workspace.id, members, role };
        })
      );
  
      // After fetching all members, update the context state for each workspace
      allMembers.forEach(({ workspaceId, members, role }) => {
        setWorkspaces((prevWorkspaces) =>
          prevWorkspaces.map((ws) =>
            ws.id === workspaceId ? { ...ws, members } : ws
          )
        );
        // Optionally set the role for the active workspace
        if (workspaceId === activeWorkspaceId) {
          setUserRole(role);
        }
      });
    } catch (error) {
      console.error('Error fetching workspace members:', error);
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
    fetchWorkspaces,
    createWorkspace,
    addMember,
    deleteWorkspace,
    switchWorkspace,
    getActiveWorkspace,
    fetchWorkspaceMembers,
    fetchAllWorkspaceMembers,
    setUserRole,
    userRole,
    members,
    setMembers
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export default WorkspaceProvider;
