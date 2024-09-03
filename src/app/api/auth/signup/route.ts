import { NextRequest, NextResponse } from 'next/server';
import { sql, QueryResult, QueryResultRow } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const { firstName, lastName, email, username, password, assistantName, defaultGreeting, accountType } = await request.json();

  // Check for missing required fields
  if (!firstName || !lastName || !email || !username || !password || !accountType) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  // Set default values for optional fields if not provided or left blank
  const finalAssistantName = assistantName && assistantName.trim() !== '' ? assistantName : 'CT Assistant';
  const finalDefaultGreeting = defaultGreeting && defaultGreeting.trim() !== '' ? defaultGreeting : 'Hey there, how can I help?';

  try {
    // Check if the user already exists by email or username to avoid duplicates
    const existingUserByUsername: QueryResult<QueryResultRow> = await sql`SELECT * FROM users WHERE username = ${username}`;
    const existingUserByEmail: QueryResult<QueryResultRow> = await sql`SELECT * FROM users WHERE email = ${email}`;

    if (existingUserByUsername.rows.length > 0 || existingUserByEmail.rows.length > 0) {
      return NextResponse.json({ message: 'User already exists with the given username or email' }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the new user
    const newUser: QueryResult<QueryResultRow> = await sql`
      INSERT INTO users (first_name, last_name, email, username, password, assistant_name, default_greeting)
      VALUES (${firstName}, ${lastName}, ${email}, ${username}, ${hashedPassword}, ${finalAssistantName}, ${finalDefaultGreeting})
      RETURNING *
    `;

    const userId = newUser.rows[0].id; // Get the new user's ID

    // Initialize the user's credits based on the account type
    await initializeUserCredits(userId, accountType);

    // Create the initial private workspace for the new user
    const newWorkspace: QueryResult<QueryResultRow> = await sql`
      INSERT INTO workspaces (owner, name, type)
      VALUES (${userId}, 'My Workspace', 'private')
      RETURNING *
    `;

    return NextResponse.json({ 
      message: 'User and workspace created successfully', 
      user: newUser.rows[0],
      workspace: newWorkspace.rows[0] 
    });
  } catch (error) {
    console.error('Error creating user and workspace:', error);
    return NextResponse.json({ message: 'Error creating user and workspace' }, { status: 500 });
  }
}

// Initialize User Credits Function
async function initializeUserCredits(userId: string, accountType: 'trial' | 'standard' | 'pro') {
  let initialCredits = 150; // Default for trial

  if (accountType === 'standard' || accountType === 'pro') {
    initialCredits = 500; // Initial credits for both standard and pro
    const subscriptionType = accountType === 'standard' ? 'standard' : 'pro';
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); // Set the next billing date to one month from now
    const nextBillingDateString = nextBillingDate.toISOString().split('T')[0];

    await sql`
      UPDATE users
      SET credits = ${initialCredits},
          subscription_type = ${subscriptionType},
          subscription_start_date = NOW(),
          next_billing_date = ${nextBillingDateString},
          annual_credit_total = ${initialCredits}
      WHERE id = ${userId};
    `;
  } else {
    // For trial users, set trial_start_date and initialize credits without setting subscription details
    await sql`
      UPDATE users
      SET credits = ${initialCredits},
          trial_start_date = NOW()
      WHERE id = ${userId};
    `;
  }
}
