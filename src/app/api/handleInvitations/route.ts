import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  const { invitationId, userId, action } = await request.json();

  if (!invitationId || !userId || !action) {
    return NextResponse.json({ message: 'Invitation ID, User ID, and action are required' }, { status: 400 });
  }

  try {
    // Start a transaction
    await client.query('BEGIN');

    // Fetch the invitation details to validate
    const inviteResult = await client.query(`
      SELECT * FROM workspace_invites WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [invitationId, userId]
    );

    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Invalid or expired invitation' }, { status: 400 });
    }

    const invite = inviteResult.rows[0];

    if (action === 'accept') {
      // Update the workspace_users table to set the status to 'confirmed'
      await client.query(`
        UPDATE workspace_users 
        SET status = 'confirmed'
        WHERE workspace_id = $1 AND user_id = $2`,
        [invite.workspace_id, invite.user_id]
      );
    } else {
      // Declining the invite, remove the user from the workspace
      await client.query(`
        DELETE FROM workspace_users
        WHERE workspace_id = $1 AND user_id = $2`,
        [invite.workspace_id, invite.user_id]
      );
    }

    // Mark the invitation as 'used' regardless of the action
    await client.query(`
      UPDATE workspace_invites
      SET status = 'used'
      WHERE id = $1`,
      [invite.id]
    );

    // Commit the transaction
    await client.query('COMMIT');

    const message = action === 'accept' 
      ? 'Workspace joined successfully' 
      : 'Invitation declined successfully';

    return NextResponse.json({ message, workspaceId: invite.workspace_id });
  } catch (error) {
    // Rollback the transaction on error
    await client.query('ROLLBACK');
    console.error('Error: Failed to process invitation:', error);
    return NextResponse.json({ message: 'Error: Failed to process invitation' }, { status: 500 });
  } finally {
    client.release();
  }
}
