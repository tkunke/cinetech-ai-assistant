import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ message: 'Invalid or missing token' }, { status: 400 });
  }

  try {
    // Validate the token and get the workspace details
    const result = await sql`
      SELECT w.name AS workspace_name, w.id AS workspace_id 
      FROM workspace_invites wi
      JOIN workspaces w ON wi.workspace_id = w.id
      WHERE wi.token = ${token} AND wi.status = 'pending'
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 });
    }

    const workspace = result.rows[0];
    return NextResponse.json({ workspaceName: workspace.workspace_name, workspaceId: workspace.workspace_id });
  } catch (error) {
    console.error('Error fetching workspace details:', error);
    return NextResponse.json({ message: 'Error fetching workspace details' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  console.log('Received request to confirm join with token:', token);

  if (!token) {
    console.error('Token is missing');
    return NextResponse.json({ message: 'Invalid or missing token' }, { status: 400 });
  }

  try {
    // Validate the token and get the user and workspace details
    const result = await sql`
      SELECT * FROM workspace_invites WHERE token = ${token} AND status = 'pending'
    `;
    
    console.log('Token validation result:', result.rows);

    if (result.rows.length === 0) {
      console.error('Token is invalid or expired');
      return NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 });
    }

    const invite = result.rows[0];

    // Confirm the membership
    const updateResult = await sql`
      UPDATE workspace_users 
      SET status = 'confirmed'
      WHERE workspace_id = ${invite.workspace_id} AND user_id = ${invite.user_id}
    `;
    
    console.log('Workspace user update result:', updateResult.rowCount);

    if (updateResult.rowCount === 0) {
      console.error('Failed to confirm membership');
      return NextResponse.json({ message: 'Failed to confirm membership' }, { status: 500 });
    }

    // Optionally, mark the invite as used
    const inviteUpdateResult = await sql`
      UPDATE workspace_invites
      SET status = 'used'
      WHERE id = ${invite.id}
    `;
    
    console.log('Workspace invite update result:', inviteUpdateResult.rowCount);

    return NextResponse.json({ message: 'Membership confirmed', workspaceId: invite.workspace_id });
  } catch (error) {
    console.error('Error confirming membership:', error);
    return NextResponse.json({ message: 'Error confirming membership' }, { status: 500 });
  }
}

