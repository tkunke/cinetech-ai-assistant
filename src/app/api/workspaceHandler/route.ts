import { NextRequest, NextResponse } from 'next/server';
import { sql, QueryResult, QueryResultRow } from '@vercel/postgres';
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
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    console.error("User ID not provided in request.");
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    console.log(`Fetching workspaces for userId: ${userId}`);
    const result: QueryResult<QueryResultRow> = await sql`
      SELECT 
        w.id AS workspace_id, 
        w.name AS workspace_name, 
        w.type AS workspace_type, 
        w.owner AS owner_id, 
        wu.user_id AS member_id, 
        wu.role AS member_role, 
        wu.status AS member_status,
        u.username AS member_username,
        u.email AS member_email
      FROM workspaces w
      LEFT JOIN workspace_users wu ON wu.workspace_id = w.id
      LEFT JOIN users u ON u.id = wu.user_id
      WHERE w.owner = ${userId} OR wu.user_id = ${userId}
    `;

    if (result.rows.length === 0) {
      console.warn(`No workspaces found for userId: ${userId}`);
      return NextResponse.json({ workspaces: [] });
    }

    // Group the results by workspace
    const workspaces = await result.rows.reduce(async (accPromise: Promise<Workspace[]>, row) => {
      const acc = await accPromise;
      let workspace = acc.find(ws => ws.id === row.workspace_id);

      if (!workspace) {
        workspace = {
          id: row.workspace_id,
          name: row.workspace_name,
          type: row.workspace_type,
          members: []
        };
        acc.push(workspace);

        // Add the owner as the first member
        const ownerResult = await sql`
          SELECT id, username, email FROM users WHERE id = ${row.owner_id}
        `;
        if (ownerResult.rows.length > 0) {
          const owner = ownerResult.rows[0];
          workspace.members.push({
            email: owner.email,
            username: owner.username,
            role: 'owner',
            status: 'confirmed',
          });
        }
      }

      // Add other members to the workspace
      if (row.member_id && row.member_role && row.member_status) {
        workspace.members.push({
          email: row.member_email,
          username: row.member_username,
          role: row.member_role,
          status: row.member_status,
        });
      }

      return acc;
    }, Promise.resolve([]));

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json({ message: 'Error fetching workspaces' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId, name, members, type } = await request.json();

  if (!userId || !name) {
    return NextResponse.json({ message: 'User ID and workspace name are required' }, { status: 400 });
  }

  const workspaceType = type || 'public';

  try {
    // Insert the new workspace
    const result: QueryResult<QueryResultRow> = await sql`
      INSERT INTO workspaces (owner, name, type)
      VALUES (${userId}, ${name}, ${workspaceType})
      RETURNING *
    `;

    const workspaceId = result.rows[0].id;

    for (const member of members) {
      const memberResult = await sql`
        SELECT id FROM users WHERE email = ${member.email}
      `;

      if (memberResult.rows.length === 0) {
        console.warn(`User with email ${member.email} not found.`);
        continue;  // Skip adding this member if the user is not found
      }

      const token = uuidv4(); // Generate a unique token for future use if needed

      // Insert the user as a pending member in workspace_users
      await sql`
        INSERT INTO workspace_users (workspace_id, user_id, role, status)
        VALUES (${workspaceId}, ${memberResult.rows[0].id}, ${member.role}, 'pending')
      `;

      // Store the invite with the generated token in workspace_invites
      await sql`
        INSERT INTO workspace_invites (workspace_id, user_id, token, status)
        VALUES (${workspaceId}, ${memberResult.rows[0].id}, ${token}, 'pending')
      `;

      // Email notification is omitted here
    }

    return NextResponse.json({ workspace: result.rows[0] });
  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json({ message: 'Error creating workspace' }, { status: 500 });
  }
}