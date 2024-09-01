import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  const { invitationId, userId } = await request.json();

  if (!invitationId || !userId) {
    return NextResponse.json({ message: 'Invitation ID and User ID are required' }, { status: 400 });
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

    // Update the workspace_users table to set the status to 'confirmed'
    await sql`
      UPDATE workspace_users 
      SET status = 'confirmed'
      WHERE workspace_id = ${invite.workspace_id} AND user_id = ${invite.user_id}
    `;

    // Mark the invitation as used
    await sql`
      UPDATE workspace_invites
      SET status = 'used'
      WHERE id = ${invite.id}
    `;

    return NextResponse.json({ message: 'Workspace joined successfully', workspaceId: invite.workspace_id });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ message: 'Error accepting invitation' }, { status: 500 });
  }
}
