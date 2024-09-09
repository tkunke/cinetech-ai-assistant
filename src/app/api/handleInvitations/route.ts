import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  const { invitationId, userId, action } = await request.json();

  if (!invitationId || !userId || !action) {
    return NextResponse.json({ message: 'Invitation ID, User ID, and action are required' }, { status: 400 });
  }

  try {
    // Fetch the invitation details to validate
    const inviteResult = await sql`
      SELECT * FROM workspace_invites WHERE id = ${invitationId} AND user_id = ${userId} AND status = 'pending'
    `;

    if (inviteResult.rows.length === 0) {
      return NextResponse.json({ message: 'Invalid or expired invitation' }, { status: 400 });
    }

    const invite = inviteResult.rows[0];

    if (action === 'accept') {
      // Update the workspace_users table to set the status to 'confirmed'
      await sql`
        UPDATE workspace_users 
        SET status = 'confirmed'
        WHERE workspace_id = ${invite.workspace_id} AND user_id = ${invite.user_id}
      `;
    } else {
      await sql`
        DELETE FROM workspace_users
        WHERE workspace_id = ${invite.workspace_id} AND user_id = ${invite.user_id}
      `;
    }

    // Mark the invitation as 'used' regardless of the action
    await sql`
      UPDATE workspace_invites
      SET status = 'used'
      WHERE id = ${invite.id}
    `;

    const message = action === 'accept' 
      ? 'Workspace joined successfully' 
      : 'Invitation declined successfully';

    return NextResponse.json({ message, workspaceId: invite.workspace_id });
  } catch (error) {
    console.error('Error processing invitation:', error);
    return NextResponse.json({ message: 'Error processing invitation' }, { status: 500 });
  }
}
