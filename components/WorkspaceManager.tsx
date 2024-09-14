import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useWorkspace, WorkspaceDetails } from '@/context/WorkspaceContext';
import { useUser } from '@/context/UserContext';
import { FaPlus, FaEllipsisH } from 'react-icons/fa';
import MessagesLibrary from '@/components/MessagesLibrary';
import ImageLibrary from '@/components/ImageLibrary';
import ProjectTags from '@/components/ProjectTags';
import styles from '@/styles/WorkspaceManager.module.css';

interface Message {
  id: string;
  content: string;
}

interface Image {
  id: string;
  imageUrl: string;
}

interface Member {
  email?: string;
  username?: string;
  role: 'viewer' | 'contributor' | 'owner';
  status?: 'pending' | 'confirmed';
  userId?: string;
}

interface WorkspaceManagerProps {
  activeLibrary: string | null;
  toggleLibrary: (library: string) => void;
  userId: string;
}

const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({ userId, activeLibrary, toggleLibrary }) => {
  const { data: session } = useSession();
  const firstName = session?.user?.first_name;
  const userName = session?.user?.name;
  const { workspaces, switchWorkspace, activeWorkspaceId, createWorkspace, addMember, fetchWorkspaces, fetchAllWorkspaceMembers, fetchWorkspaceMembers, setMembers, members, setUserRole, userRole } = useWorkspace();
  const { invitations, fetchInvitations } = useUser();
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isAddMemberPopupVisible, setIsAddMemberPopupVisible] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [showLibraries, setShowLibraries] = useState(false);
  const [libraryOrder, setLibraryOrder] = useState<string[]>(['messages', 'images', 'tags']);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'contributor'>('viewer');
  const [errorMessage, setErrorMessage] = useState('');
  const [usernameResult, setUsernameResult] = useState<string | null>(null);
  const [showInvitationPopup, setShowInvitationPopup] = useState(false);
  const [showGlobalWorkspaceMenu, setShowGlobalWorkspaceMenu] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [showWorkspaceMenuId, setShowWorkspaceMenuId] = useState<string | null>(null);
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const ellipsisRef = useRef<HTMLDivElement | null>(null);
  

  useEffect(() => {
    fetchInvitations(); // Fetch invitations on component mount
  }, []);

  useEffect(() => {
    if (invitations.length > 0) {
      console.log('Displaying invitations:', invitations); // Log the invitations to confirm
      setShowInvitationPopup(true); // Show the invitation popup if there are invitations
    }
  }, [invitations]);

  const toggleGlobalWorkspaceMenu = () => {
    setShowGlobalWorkspaceMenu(!showGlobalWorkspaceMenu);
  };

  const handleShowInvitations = () => {
    setShowInvitationPopup(true); // Show invitations
    setShowGlobalWorkspaceMenu(false);  // Close the global workspace menu
  };

  const toggleWorkspaceList = () => {
    setShowWorkspaces((prev) => !prev);

    if (!showWorkspaces) {
      fetchAllWorkspaceMembers(userId);
    }
  };

  const toggleWorkspaceMenu = (workspaceId: string, userRole: 'owner' | 'contributor' | 'viewer') => {
    console.log('Ellipsis clicked for workspace:', workspaceId); // Debug line
    if (showWorkspaceMenuId === workspaceId) {
      console.log('Closing menu for workspace:', workspaceId); // Debug line
      setShowWorkspaceMenuId(null); // Close the menu if it's already open
    } else {
      console.log('Opening menu for workspace:', workspaceId); // Debug line
      setShowWorkspaceMenuId(workspaceId); // Open the menu for the clicked workspace
    }
  };  

  const toggleLibrarySection = () => {
    setShowLibraries((prev) => !prev);
  };

  const handleNewWorkspaceClick = () => {
    setIsPopupVisible(true);
  };

  const handleLibraryClick = (library: string) => {
    toggleLibrary(library);
    setLibraryOrder((prevOrder) => {
      const newOrder = prevOrder.filter((item) => item !== library);
      return [...newOrder, library];
    });
  };

  const handleAddMember = async (workspaceId: string) => {
    if (!email && !userName) {
      setErrorMessage('Please provide either an email or username.');
      return;
    }
  
    try {
      // Build the query parameter string based on email or username
      let queryParam = '';
      if (email) {
        queryParam = `email=${encodeURIComponent(email)}`;
      } else if (userName) {
        queryParam = `username=${encodeURIComponent(userName)}`;
      }
  
      // Check if user exists by either email or username
      const response = await fetch(`/api/checkUser?${queryParam}`);
      const data = await response.json();

      console.log('CheckUser API response:', data);
  
      if (data.exists) {
        // Proceed with adding the member to the selected workspace
        console.log('Calling addMember with:', {
          email: data.email || undefined,
          username: data.username,
          role: role,
        });
        
        const addMemberResponse = await addMember(workspaceId, {
          email: data.email || undefined, // Send email if present
          username: data.username || undefined, // Send username if present
          role: role,
        });
  
        console.log('Add member response:', addMemberResponse);
  
        setErrorMessage('');
        setMembers([...members, { email: data.email || '', username: data.username, role, status: 'pending', userId: data.userId }]);
      } else {
        setErrorMessage('User not found.');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      setErrorMessage('Failed to validate user. Please try again.');
    }
  };           

  const handleRemoveMember = (emailToRemove: string) => {
    setMembers(members.filter((member) => member.email !== emailToRemove));
  };
  
  const handleCreateWorkspace = async () => {
    const workspaceDetails: WorkspaceDetails = {
      name: workspaceName,
      owner: session?.user?.id || '', // Use session data to get the user's ID
      members: [], // No members will be added during creation
    };
  
    // Await the result of createWorkspace and ensure its return type is handled
    const newWorkspaceId = await createWorkspace(workspaceDetails);
  
    if (newWorkspaceId) {
      // Workspace created successfully
      console.log(`Workspace "${workspaceName}" created with ID: ${newWorkspaceId}`);
    } else {
      console.error('Failed to create workspace');
    }
  
    // Reset form fields after workspace creation
    setWorkspaceName(''); // Clear the workspace name input field
    setIsPopupVisible(false); // Close the popup after creation
  };
    
  
  const handleAcceptInvite = async (invitationId: string, userId: string) => {
    try {
      const response = await fetch(`/api/handleInvitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId, userId, action: 'accept' }),
      });

      if (response.ok) {
        fetchWorkspaces();
        fetchInvitations(); // Refresh invitations after accepting
        setShowInvitationPopup(false);
      } else {
        console.error('Failed to join workspace');
      }
    } catch (error) {
      console.error('Error joining workspace:', error);
    }
  };

  const handleDeclineInvite = async (invitationId: string, userId: string) => {
    try  {
      const response = await fetch('/api/handleInvitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId, userId, action: 'decline' }),
      });

      if (response.ok) {
        fetchInvitations();
        setShowInvitationPopup(false);
      } else {
        console.error('Failed to decline invitation');
      }
    } catch (error) {
      console.error('Decline invitation error', error);
    }
  };

  const handleToggleMembers = async (workspaceId: string) => {
    if (expandedWorkspaceId === workspaceId) {
      setExpandedWorkspaceId(null); // Collapse the workspace if it's already expanded
    } else {
      setExpandedWorkspaceId(workspaceId); // Expand the clicked workspace
    }
  };

  const handleLeaveWorkspace = async (workspaceId: string, userId: string) => {
    try {
      const response = await fetch(`/api/workspaceMembers`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceId, userId }), // Send the data in the request body
      });
  
      if (response.ok) {
        console.log('Successfully left workspace');
        // Refetch workspaces to update the UI
        fetchWorkspaces();
      } else {
        console.error('Failed to leave workspace');
      }
    } catch (error) {
      console.error('Error leaving workspace:', error);
    }
  };    

  const makeWorkspaceActive = (workspaceId: string) => {
    switchWorkspace(workspaceId);
    setShowWorkspaceMenuId(null);
  };

  const openAddMemberPopup = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    setIsAddMemberPopupVisible(true);
    setShowWorkspaceMenuId(null); // Close the menu
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        ellipsisRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !ellipsisRef.current.contains(event.target as Node)
      ) {
        setShowWorkspaceMenuId(null); // Close the menu if clicked outside
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      setMembers([]);
    };
  }, []);

  return (
    <div className={styles.workspaceManagerContainer}>
      {/* Invitation Popup */}
      {showInvitationPopup && (
        <div className={styles.invitationPopupOverlay}>
          <div className={styles.invitationPopup}>
            {invitations.length > 0 ? (
              invitations.map((invite) => (
                <div key={invite.id} className={styles.invitationMessage}>
                  <p>{invite.ownerName} has invited you to join {invite.workspaceName}.</p>
                  <button className={styles.joinButton} onClick={() => handleAcceptInvite(invite.id, userId)}>Join</button>
                  <button className={styles.declineButton} onClick={() => handleDeclineInvite(invite.id, userId)}>Decline</button>
                </div>
              ))
            ) : (
              <div className={styles.invitationMessage}>
                <p>You don&apost have any invitations at the moment.</p>
              </div>
            )}
            <button className={styles.closeButton} onClick={() => setShowInvitationPopup(false)}>x</button>
          </div>
        </div>
      )}

      {/* Active Workspace Display */}
      {activeWorkspaceId && (
        <div className={styles.activeWorkspaceDisplay}>
          {workspaces.find((ws) => ws.id === activeWorkspaceId)?.name === 'My Workspace'
            ? `Active: ${firstName || 'My'}'s Workspace`
            : `Active: ${workspaces.find((ws) => ws.id === activeWorkspaceId)?.name}`}
        </div>
      )}

      {/* Workspaces Header with Global Ellipsis Icon */}
      <h2 className={styles.workspaceSectionTitle}>
        <span onClick={toggleWorkspaceList}>Workspaces</span>
        <FaEllipsisH 
          className={styles.menuIcon} 
          onClick={(e) => {
            e.stopPropagation(); // Prevent the click from propagating up to the parent
            toggleGlobalWorkspaceMenu();
          }} 
        />
      </h2>

      {/* Global Workspace Dropdown Menu */}
      {showGlobalWorkspaceMenu && (
        <div className={styles.workspaceMenu} onMouseLeave={() => setShowGlobalWorkspaceMenu(false)}>
          <button onClick={handleNewWorkspaceClick}>Create New Workspace</button>
          <button onClick={handleShowInvitations}>View Invitations</button>
        </div>
      )}

      {showWorkspaces && (
        <>
          {workspaces.map((ws) => (
            <div key={ws.id} className={styles.workspaceContainer}>
              <div className={styles.workspaceItem}>
                <button
                  className={`${styles.workspaceButton} ${expandedWorkspaceId === ws.id ? styles.active : ''}`}
                  onClick={() => handleToggleMembers(ws.id)}
                >
                  {ws.name === 'My Workspace'
                    ? `${firstName}'s Workspace (private)`
                    : ws.name}
                </button>
                {showWorkspaceMenuId === ws.id && (
                  <div
                    ref={menuRef} 
                    className={styles.workspaceMenu}
                    onMouseLeave={() => setShowWorkspaceMenuId(null)} // Close the menu when the mouse leaves
                  >
                    {/* Check if workspace is private */}
                    {ws.type === 'private' ? (
                      // Private workspace: Only show 'Make Active'
                      <button onClick={() => makeWorkspaceActive(ws.id)}>Make Active</button>
                    ) : userRole === 'owner' ? (
                      // Public workspace owned by the user: Show both 'Make Active' and 'Add Member'
                      <>
                        <button onClick={() => makeWorkspaceActive(ws.id)}>Make Active</button>
                        <button onClick={() => openAddMemberPopup(ws.id)}>Add Member</button>
                      </>
                    ) : (
                      // Public workspace where user is not the owner: Show 'Make Active' and 'Leave Workspace'
                      <>
                        <button onClick={() => makeWorkspaceActive(ws.id)}>Make Active</button>
                        <button onClick={() => handleLeaveWorkspace(ws.id, userId)}>Leave Workspace</button>
                      </>
                    )}
                  </div>
                )}
                <div ref={ellipsisRef} onClick={() => userRole && toggleWorkspaceMenu(ws.id, userRole)}>
                  <FaEllipsisH className={styles.menuIcon} />
                </div>
              </div>
              
              {/* Only render the members list for public workspaces */}
              {ws.type === 'public' && expandedWorkspaceId === ws.id && (
                <div className={styles.membersList}>
                  <ul>
                    {members
                      .sort((a, b) => (a.role === 'owner' ? -1 : 1)) // Sort to make the owner appear first
                      .map((member: Member, index: number) => {
                        const isCurrentUser = member.username === userName;
                        const isOwner = member.role === 'owner';
                        return (
                          <li 
                            key={index} 
                            className={`${styles.memberItem} ${isOwner ? styles.ownerItem : ''}`} // Add a class if the member is the owner
                          >
                            <span className={styles.memberIcon}>👤</span>
                            {isCurrentUser 
                              ? `You (${member.role})`
                              : `${member.username} (${member.role})`}
                            {member.status === 'pending' && ' (Pending)'}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Content Libraries Section */}
      <div>
        <h2 className={styles.workspaceSectionTitle} onClick={toggleLibrarySection}>
          Content Libraries {showLibraries}
        </h2>
        {showLibraries && activeWorkspaceId && (
          <div className={styles.librarySection}>
            {libraryOrder.map((library) => (
              <React.Fragment key={library}>
                <button
                  onClick={() => handleLibraryClick(library)}
                  className={`${styles.libraryButton} ${activeLibrary === library ? styles.active : ''}`}
                >
                  {library === 'messages' && 'Messages Library'}
                  {library === 'images' && 'Image Library'}
                  {library === 'tags' && 'Project Tags'}
                </button>
                {activeLibrary === library && (
                  <div className={styles.libraryContent}>
                    {library === 'messages' && (
                      <MessagesLibrary
                        userId={userId}
                        onTagIconClick={(message: Message) => console.log('Tag icon clicked:', message)}
                      />
                    )}
                    {library === 'images' && (
                      <ImageLibrary
                        userId={userId}
                        onTagIconClick={(image: Image) => console.log('Tag icon clicked:', image)}
                      />
                    )}
                    {library === 'tags' && (
                      <ProjectTags userId={userId} />
                    )}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Popup for Creating New Workspace */}
      {isPopupVisible && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => setIsPopupVisible(false)}>
              &times;
            </button>
            <h3>Create New Workspace</h3>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Workspace Name"
              required
              className={styles.inputField}
            />
            <button onClick={handleCreateWorkspace} className={styles.submitButton}>
              Create Workspace
            </button>
          </div>
        </div>
      )}

      {/* Popup for Adding a Member */}
      {isAddMemberPopupVisible && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => setIsAddMemberPopupVisible(false)}>
              &times;
            </button>
            <h3>Add Member to Workspace</h3>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Invite Member by Email"
              className={styles.inputField}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'viewer' | 'contributor')}
              className={styles.selectField}
            >
              <option value="viewer">Viewer</option>
              <option value="contributor">contributor</option>
            </select>

            <button onClick={() => handleAddMember(selectedWorkspaceId!)}>
              Add Member
            </button>
            {/* Display Username or Error Message */}
            {usernameResult ? (
              <p className={styles.successMessage}>User found: {usernameResult}</p>
            ) : (
              errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceManager;
