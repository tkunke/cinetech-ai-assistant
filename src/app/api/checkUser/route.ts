import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const userId = searchParams.get('userId');

  if (!email && !userId) {
    return NextResponse.json({ message: 'Email or User ID is required' }, { status: 400 });
  }

  try {
    let userQuery;

    if (email) {
      userQuery = await sql`
        SELECT id, username
        FROM users
        WHERE email = ${email}
      `;
    } else if (userId) {
      userQuery = await sql`
        SELECT id, username, trial_start_date, credits, status
        FROM users
        WHERE id = ${userId}
      `;
    }

    if (!userQuery || userQuery.rows.length === 0) {
      return NextResponse.json({ exists: false });
    }

    const user = userQuery.rows[0];
    let trialExpired = false;
    let credits = user.credits;
    let statusUpdated = false;

    // Check if trial_start_date is null
    if (user.trial_start_date) {
      const trialStartDate = new Date(user.trial_start_date);
      const currentDate = new Date();
      const daysSinceTrialStart = Math.floor((currentDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceTrialStart > 7) {
        trialExpired = true;
      }
    }

    const shouldBeInactive = trialExpired || credits <= 0;

    if (shouldBeInactive && user.status !== 'inactive') {
      await sql`
        UPDATE users
        SET status = 'inactive'
        WHERE id = ${user.id}
      `;
      statusUpdated = true;
    }

    return NextResponse.json({
      exists: true,
      username: user.username,  // For the existing call using email
      trialExpired: trialExpired,  // New field for UserContext
      credits: credits,  // New field for UserContext
      status: shouldBeInactive ? 'inactive' : user.status,  // New field for UserContext
      statusUpdated: statusUpdated,  // New field for UserContext
    });
  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json({ message: 'Error checking user status' }, { status: 500 });
  }
}
