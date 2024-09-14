import { NextRequest, NextResponse } from 'next/server';
import { Pool, QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';

interface Member {
  email: string;
  username: string;
  role: string;
  status: string;
}

interface Workspace {
  id: string;
  name: string;
  type: string;
  members: Member[];
  owner: Member;
}

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use your Supabase connection string here
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    console.log(`Fetching workspaces for userId: ${userId}`);

    // Fetch workspaces and users in one query
    const result = await client.query(`
      SELECT 
        w.id AS workspace_id, 
        w.name AS workspace_name, 
        w.type AS workspace_type, 
        w.owner AS owner_id,
        owner.username AS owner_username,
        owner.email AS owner_email,
        wu.user_id AS member_id, 
        wu.role AS member_role, 
        wu.status AS member_status,
        u.username AS member_username,
        u.email AS member_email
      FROM workspaces w
      LEFT JOIN workspace_users wu ON wu.workspace_id = w.id
      LEFT JOIN users u ON u.id = wu.user_id
      LEFT JOIN users owner ON owner.id = w.owner
      WHERE w.owner = $1 
      OR (wu.user_id = $1 AND wu.status = 'confirmed')`,
      [userId]
    );

    const workspacesMap = new Map();  // To store workspaces and avoid duplicates

    result.rows.forEach(row => {
      let workspace = workspacesMap.get(row.workspace_id);

      if (!workspace) {
        workspace = {
          id: row.workspace_id,
          name: row.workspace_name,
          type: row.workspace_type,
          members: [],
          owner: {
            email: row.owner_email,
            username: row.owner_username,
            role: 'owner',
            status: 'confirmed',
          },
        };
        workspacesMap.set(row.workspace_id, workspace);
      }

      // Add members to the workspace, but exclude the owner
      if (row.member_id && row.member_id !== row.owner_id) {
        workspace.members.push({
          email: row.member_email,
          username: row.member_username,
          role: row.member_role,
          status: row.member_status,
        });
      }
    });

    const workspaces = Array.from(workspacesMap.values());
    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json({ message: 'Error fetching workspaces' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { userId, name, members, type, workspaceId, member } = await request.json();
    console.log('Received member payload:', member);

    if (workspaceId && member) {
      // Adding a member to an existing workspace
      try {
        let memberResult: QueryResult<any> | undefined;  // Initialize memberResult

        // Check for email first, fallback to username if no email is provided
        if (member.email) {
          memberResult = await client.query(
            `SELECT id FROM users WHERE email = $1`,
            [member.email]
          );
        } else if (member.username) {
          memberResult = await client.query(
            `SELECT id FROM users WHERE username = $1`,
            [member.username]
          );
        }

        if (!memberResult || memberResult.rows.length === 0) {
          console.warn(`User with ${member.email ? 'email' : 'username'} ${member.email || member.username} not found.`);
          return NextResponse.json({ message: `User with ${member.email ? 'email' : 'username'} ${member.email || member.username} not found.` }, { status: 404 });
        }

        const token = uuidv4();

        // Transaction: Add member & workspace invite
        await client.query('BEGIN');

        const insertUserResult = await client.query(
          `INSERT INTO workspace_users (workspace_id, user_id, role, status)
           VALUES ($1, $2, $3, 'pending')`,
          [workspaceId, memberResult.rows[0].id, member.role]
        );

        console.log('Inserted into workspace_users:', insertUserResult);

        const insertInviteResult = await client.query(
          `INSERT INTO workspace_invites (workspace_id, user_id, token, status)
           VALUES ($1, $2, $3, 'pending')`,
          [workspaceId, memberResult.rows[0].id, token]
        );

        console.log('Inserted into workspace_invites:', insertInviteResult);

        await client.query('COMMIT');

        return NextResponse.json({ member: { ...member, status: 'pending' } });
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding member to workspace:', error);
        return NextResponse.json({ message: 'Error adding member to workspace' }, { status: 500 });
      }
    } else {
      // Handle workspace creation as before
      if (!userId || !name) {
        return NextResponse.json({ message: 'User ID and workspace name are required' }, { status: 400 });
      }

      const workspaceType = type || 'public';

      try {
        // Transaction: Create workspace & add members
        await client.query('BEGIN');

        const newWorkspace = await client.query(
          `INSERT INTO workspaces (owner, name, type)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [userId, name, workspaceType]
        );

        const workspaceId = newWorkspace.rows[0].id;

        for (const member of members) {
          let memberResult: QueryResult<any> | undefined;  // Initialize memberResult

          if (member.email) {
            memberResult = await client.query(
              `SELECT id FROM users WHERE email = $1`,
              [member.email]
            );
          } else if (member.username) {
            memberResult = await client.query(
              `SELECT id FROM users WHERE username = $1`,
              [member.username]
            );
          }

          if (memberResult && memberResult.rows.length > 0) {
            const token = uuidv4();

            await client.query(
              `INSERT INTO workspace_users (workspace_id, user_id, role, status)
               VALUES ($1, $2, $3, 'pending')`,
              [workspaceId, memberResult.rows[0].id, member.role]
            );

            await client.query(
              `INSERT INTO workspace_invites (workspace_id, user_id, token, status)
               VALUES ($1, $2, $3, 'pending')`,
              [workspaceId, memberResult.rows[0].id, token]
            );
          } else {
            console.warn(`User with ${member.email ? 'email' : 'username'} ${member.email || member.username} not found.`);
          }
        }

        await client.query('COMMIT');
        return NextResponse.json({ workspace: newWorkspace.rows[0] });
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating workspace:', error);
        return NextResponse.json({ message: 'Error creating workspace' }, { status: 500 });
      }
    }
  } finally {
    client.release();
  }
}