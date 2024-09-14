import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    const result = await client.query(`
      SELECT 
        wi.id as invite_id,
        w.id as workspace_id,
        w.name as workspace_name,
        u.username as owner_name  -- Use the correct column name for the owner's username
      FROM workspace_invites wi
      JOIN workspaces w ON wi.workspace_id = w.id
      JOIN users u ON w.owner = u.id  -- Join with users table to get the owner's username
      WHERE wi.user_id = $1
      AND wi.status = 'pending'`,
      [userId]  // Pass the userId as a parameter
    );

    const invitations = result.rows.map(row => ({
      id: row.invite_id,
      workspaceName: row.workspace_name,
      workspaceId: row.workspace_id,
      ownerName: row.owner_name,  // Include the owner's username in the invitation object
    }));

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ message: 'Error fetching invitations' }, { status: 500 });
  } finally {
    client.release();
  }
}
