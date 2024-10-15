'use client';

import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import { useLibrary, Image as LibraryImage, Message } from '@/context/LibraryContext'; // Renamed Image and imported Message
import { useWorkspace, Workspace } from '@/context/WorkspaceContext'; // Fixed Workspace type
import { useSession } from 'next-auth/react';
import styles from '@/styles/contentlibraries.module.css';
import { AiOutlineArrowLeft } from 'react-icons/ai';

const ContentLibraries: React.FC = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id || '';
  const { workspaces, fetchWorkspaces } = useWorkspace();
  const { fetchImages, fetchMessages, workspaceImages, workspaceMessages } = useLibrary(); // Access workspace-specific images and messages
  const router = useRouter();

  useEffect(() => {
    if (userId) {
      fetchWorkspaces(); // Fetch all workspaces for the user
    }
  }, [userId, fetchWorkspaces]);

  const handleBackToAssistantClick = () => {
    router.push('/assistant'); // Navigate back to the assistant page
  };

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <header className={styles.header}>
        <button onClick={handleBackToAssistantClick} className={styles.backButton} title="Back to Assistant">
          <AiOutlineArrowLeft className={styles.arrowIcon}/>
          <span>Assistant</span>
        </button>
      </header>
      <h1 className={styles.heading}>Content Libraries</h1>
      {workspaces.length > 0 ? (
        workspaces.map((workspace) => (
          <WorkspaceContentSection
            key={workspace.id}
            workspace={workspace}
            fetchImages={fetchImages} // Fetch images for each workspace
            fetchMessages={fetchMessages} // Fetch messages for each workspace
            fetchedImages={workspaceImages[workspace.id] || []} // Specific images for the workspace
            fetchedMessages={workspaceMessages[workspace.id] || []} // Specific messages for the workspace
          />
        ))
      ) : (
        <p>No workspaces found.</p>
      )}
    </div>
  );
};

interface WorkspaceContentSectionProps {
  workspace: Workspace;
  fetchImages: (workspaceId: string) => Promise<void>;
  fetchMessages: (workspaceId: string) => Promise<Message[]>;
  fetchedImages: LibraryImage[];
  fetchedMessages: Message[];
}

const WorkspaceContentSection: React.FC<WorkspaceContentSectionProps> = ({
  workspace,
  fetchImages,
  fetchMessages,
  fetchedImages,
  fetchedMessages,
}) => {
  useEffect(() => {
    if (workspace.id) {
      fetchImages(workspace.id);
      fetchMessages(workspace.id);
    }
  }, [workspace.id, fetchImages, fetchMessages]);

  return (
    <div className={styles.workspaceSection}>
      <h1 className={styles.workspaceName}>Workspace: {workspace.name}</h1>

      <section className={styles.imagesSection}>
        <h2>Saved Images</h2>
        <div className={styles.imagesGrid}>
          {fetchedImages.length > 0 ? (
            fetchedImages.map((image) => (
              <div key={image.id} className={styles.imageCard}>
                <img src={image.thumbnailUrl} alt="thumbnail" className={styles.image} />
              </div>
            ))
          ) : (
            <p>No images found for this workspace.</p>
          )}
        </div>
      </section>

      <section className={styles.messagesSection}>
        <h2>Saved Messages</h2>
        <div className={styles.messagesList}>
          {fetchedMessages.length > 0 ? (
            fetchedMessages.map((message) => (
              <div key={message.id} className={styles.messageCard}>
                <div className={styles.messageContent}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.preview}
                  </ReactMarkdown>
                </div>
                <span className={styles.timestamp}>
                  {new Date(message.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p>No messages found for this workspace.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ContentLibraries;
