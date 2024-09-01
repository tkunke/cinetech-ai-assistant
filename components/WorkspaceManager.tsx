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
  email: string;
  username: string;
  role: 'viewer' | 'editor';
  status: 'pending' | 'confirmed';
}

interface WorkspaceManagerProps {
  activeLibrary: string | null;
  toggleLibrary: (library: string) => void;
  userId: string;
}

const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({ userId, activeLibrary, toggleLibrary }) => {
  const { data: session } = useSession();
  const firstName = session?.user?.first_name;
  const { workspaces, switchWorkspace, activeWorkspaceId, createWorkspace } = useWorkspace();
  const { invitations, fetchInvitations } = useUser();
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isAddMemberPopupVisible, setIsAddMemberPopupVisible] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [showMembers, setShowMembers] = useState<{ [key: string]: boolean }>({});
  const [showLibraries, setShowLibraries] = useState(false);
  const [libraryOrder, setLibraryOrder] = useState<string[]>(['messages', 'images', 'tags']);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [errorMessage, setErrorMessage] = useState('');
  const [usernameResult, setUsernameResult] = useState<string | null>(null);
  const [showInvitationPopup, setShowInvitationPopup] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [showWorkspaceMenuId, setShowWorkspaceMenuId] = useState<string | null>(null);
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

  const toggleWorkspaceList = () => {
    setShowWorkspaces((prev) => !prev);
  };

  const toggleWorkspaceMenu = (workspaceId: string) => {
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

  const handleAddMember = async () => {
    if (!selectedWorkspaceId) return;

    try {
      const response = await fetch(`/api/checkUser?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (data.exists) {
        setUsernameResult(data.username);
        setMembers([...members, { email, username: data.username, role, status: 'pending' }]);
        setErrorMessage('');
      } else {
        setUsernameResult(null);
        setErrorMessage('This email is not registered.');
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setErrorMessage('Failed to validate email. Please try again.');
    }
  };

  const handleRemoveMember = (emailToRemove: string) => {
    setMembers(members.filter((member) => member.email !== emailToRemove));
  };

  const handleCreateWorkspace = async () => {
    const workspaceDetails: WorkspaceDetails = {
      name: workspaceName,
      owner: session?.user?.id || '',
      members: members.map(member => ({
        email: member.email,
        role: member.role,
        status: member.status,
      })),
    };

    createWorkspace(workspaceDetails);

    // After creation, the workspace state is updated in the context, so no need to manually update state here
    setWorkspaceName('');
    setEmail('');
    setMembers([]);
    setIsPopupVisible(false);
  };

  const handleAcceptInvite = async (invitationId: string, userId: string) => {
    try {
      const response = await fetch(`/api/acceptInvitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId, userId }),
      });

      if (response.ok) {
        fetchInvitations(); // Refresh invitations after accepting
        setShowInvitationPopup(false);
      } else {
        console.error('Failed to join workspace');
      }
    } catch (error) {
      console.error('Error joining workspace:', error);
    }
  };

  const handleDeclineInvite = (inviteId: string) => {
    // Handle declining the invitation (e.g., remove from invitations, call an API)
    setShowInvitationPopup(false);
  };

  const handleToggleMembers = (workspaceId: string | null) => {
    if (workspaceId !== null) {
      setShowMembers((prevState) => ({
        ...prevState,
        [workspaceId]: !prevState[workspaceId],
      }));
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

  return (
    <div className={styles.workspaceManagerContainer}>
      {/* Invitation Popup */}
      {showInvitationPopup && invitations.length > 0 && (
        <div className={styles.invitationPopupOverlay}>
          <div className={styles.invitationPopup}>
            {invitations.map((invite) => (
              <div key={invite.id} className={styles.invitationMessage}>
                <p>{invite.ownerName} has invited you to join {invite.workspaceName}.</p>
                <button onClick={() => handleAcceptInvite(invite.id, userId)}>Join</button>
                <button onClick={() => handleDeclineInvite(invite.id)}>Decline</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Workspace Display */}
      <h2 className={styles.activeHeader}>Active Workspace</h2>
      {activeWorkspaceId && (
        <div className={styles.activeWorkspaceDisplay}>
          {workspaces.find((ws) => ws.id === activeWorkspaceId)?.name === 'My Workspace'
            ? `${firstName || 'My'}'s Workspace`
            : workspaces.find((ws) => ws.id === activeWorkspaceId)?.name}
        </div>
      )}

      {/* Workspaces Section */}
      <h2 className={styles.workspaceSectionTitle} onClick={toggleWorkspaceList}>
        <span>Workspaces</span>
        <FaPlus className={styles.addWorkspaceIcon} onClick={handleNewWorkspaceClick} />
      </h2>
      {showWorkspaces && (
        <>
          {workspaces
            .map((ws) => (
              <div key={ws.id} className={styles.workspaceContainer}>
                <div className={styles.workspaceItem}>
                  <button
                    className={styles.workspaceButton}
                    onClick={() => handleToggleMembers(ws.id)}
                  >
                    {ws.name === 'My Workspace'
                      ? `${firstName}'s Workspace (private)`
                      : ws.name}
                  </button>
                  {showWorkspaceMenuId === ws.id && (
                    <div ref={menuRef} className={styles.workspaceMenu}>
                      <button onClick={() => makeWorkspaceActive(ws.id)}>Make Active</button>
                      <button onClick={() => openAddMemberPopup(ws.id)}>Add Member</button>
                      <button onClick={() => handleRemoveMember(ws.id)}>Remove Member</button>
                    </div>
                  )}
                  <div ref={ellipsisRef} onClick={() => toggleWorkspaceMenu(ws.id)}>
                    <FaEllipsisH className={styles.menuIcon} />
                  </div>
                </div>
                {ws.type === 'public' && showMembers[ws.id] && (
                  <div className={styles.membersList}>
                    <ul>
                      {ws.members.map((member: Member, index: number) => (
                        <li key={index} className={styles.memberItem}>
                          <span className={styles.memberIcon}>👤</span> {/* Small user icon */}
                          {member.username} ({member.role}) {member.status === 'pending' ? '(pending)' : ''}
                        </li>
                      ))}
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

      {/* Popup for Creating Shared Workspace */}
      {isPopupVisible && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => setIsPopupVisible(false)}>
              &times;
            </button>
            <h3>Create Shared Workspace</h3>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Workspace Name"
              required
              className={styles.inputField}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Invite Member by Email"
              className={styles.inputField}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
              className={styles.selectField}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>

            <button onClick={handleAddMember}>
              Add Member
            </button>
            {/* Display Username or Error Message */}
            {usernameResult ? (
              <p className={styles.successMessage}>User found: {usernameResult}</p>
            ) : (
              errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>
            )}

            <ul>
              {members.map((member, index) => (
                <li key={index}>
                  {member.username} ({member.role}) {member.status === 'pending' ? '(pending)' : ''}
                  <button type="button" onClick={() => handleRemoveMember(member.email)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <button type="button" onClick={handleCreateWorkspace} className={styles.submitButton}>
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
              onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
              className={styles.selectField}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>

            <button onClick={handleAddMember}>
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
