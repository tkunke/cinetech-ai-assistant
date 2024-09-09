import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// POST: Add a member to a workspace
export async function POST(request: NextRequest) {
  const { workspaceId, email, role } = await request.json();

  try {
    // Check if the user exists
    const user = await sql`SELECT id, username FROM users WHERE email = ${email}`;

    if (user.rows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = user.rows[0].id;

    // Insert the user into the 'workspace_users' table with the specified role
    await sql`
      INSERT INTO workspace_users (workspace_id, user_id, role)
      VALUES (${workspaceId}, ${userId}, ${role});
    `;

    return NextResponse.json({ message: 'Member added successfully', username: user.rows[0].username });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json({ message: 'Error adding member' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');
  const userId = searchParams.get('userId');

  if (!workspaceId || !userId) {
    return NextResponse.json({ message: 'Workspace ID and User ID are required' }, { status: 400 });
  }

  try {
    // Fetch members from workspace_users table
    const membersResult = await sql`
      SELECT u.id as "userId", u.email, u.username, wu.role, wu.status 
      FROM workspace_users wu 
      JOIN users u ON wu.user_id = u.id 
      WHERE wu.workspace_id = ${workspaceId}
    `;
  
    // Fetch the owner from the workspaces table
    const ownerResult = await sql`
      SELECT u.id as "userId", u.email, u.username 
      FROM workspaces w 
      JOIN users u ON w.owner = u.id 
      WHERE w.id = ${workspaceId}
    `;
  
    const members = membersResult.rows;
    const owner = ownerResult.rows[0];
  
    // Add the owner to the members array with the role 'owner'
    if (owner) {
      members.push({
        userId: owner.userId,  // Ensure consistent casing
        email: owner.email,
        username: owner.username,
        role: 'owner',
        status: 'confirmed',
      });
    }
  
    return NextResponse.json({ members, role: members.find(member => member.userId === userId)?.role });
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    return NextResponse.json({ message: 'Error fetching workspace members' }, { status: 500 });
  }  
}

// DELETE: Remove a member from a workspace
export async function DELETE(request: NextRequest) {
  const { workspaceId, userId } = await request.json();

  try {
    // Delete the user from the 'workspace_users' table
    await sql`
      DELETE FROM workspace_users 
      WHERE workspace_id = ${workspaceId} AND user_id = ${userId};
    `;

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ message: 'Error removing member' }, { status: 500 });
  }
}
