import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use your Supabase connection string here
});

// POST: Add a member to a workspace
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { workspaceId, email, role } = await request.json();

    // Check if the user exists
    const userResult = await client.query(
      `SELECT id, username FROM users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    // Insert the user into the 'workspace_users' table with the specified role
    await client.query(
      `INSERT INTO workspace_users (workspace_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [workspaceId, userId, role]
    );

    return NextResponse.json({
      message: 'Member added successfully',
      username: userResult.rows[0].username,
    });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json({ message: 'Error adding member' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const userId = searchParams.get('userId');

    if (!workspaceId || !userId) {
      return NextResponse.json({ message: 'Workspace ID and User ID are required' }, { status: 400 });
    }

    // Fetch members from the workspace_users table
    const membersResult = await client.query(`
      SELECT u.id as "userId", u.email, u.username, wu.role, wu.status
      FROM workspace_users wu
      JOIN users u ON wu.user_id = u.id
      WHERE wu.workspace_id = $1`,
      [workspaceId]
    );

    // Fetch the owner from the workspaces table
    const ownerResult = await client.query(`
      SELECT u.id as "userId", u.email, u.username
      FROM workspaces w
      JOIN users u ON w.owner = u.id
      WHERE w.id = $1`,
      [workspaceId]
    );

    const members = membersResult.rows;
    const owner = ownerResult.rows[0];

    // Add the owner to the members array with the role 'owner'
    if (owner) {
      members.push({
        userId: owner.userId,
        email: owner.email,
        username: owner.username,
        role: 'owner',
        status: 'confirmed',
      });
    }

    return NextResponse.json({
      members,
      role: members.find(member => member.userId === userId)?.role,
    });
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    return NextResponse.json({ message: 'Error fetching workspace members' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { workspaceId, userId } = await request.json();

    // Delete the user from the 'workspace_users' table
    await client.query(
      `DELETE FROM workspace_users WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ message: 'Error removing member' }, { status: 500 });
  } finally {
    client.release();
  }
}
