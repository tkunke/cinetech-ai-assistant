import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Pool, PoolClient } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

const isServerSide = typeof window === 'undefined';
const baseUrl = isServerSide ? process.env.NEXT_PUBLIC_BASE_URL : '';

// Function to create an assistant via OpenAI
async function createAssistant(username: string) {
  const assistantName = `${username}_cinetech_openai`;
  try {
    const response = await fetch(`${baseUrl}/api/createAssistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantName,
      })
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.assistant.id;
  } catch (error) {
    console.error('Error creating assistant:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const { firstName, lastName, email, username, password, assistantName, accountType } = await request.json();

  // Check for missing required fields
  if (!firstName || !lastName || !email || !username || !password || !accountType) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  // Set default values for optional fields if not provided or left blank
  const finalAssistantName = assistantName && assistantName.trim() !== '' ? assistantName : 'CT Assistant';

  const client = await pool.connect(); // Connect to the database

  try {
    // Check if the user already exists by email or username to avoid duplicates
    const existingUserByUsername = await client.query('SELECT * FROM users WHERE username = $1', [username]);
    const existingUserByEmail = await client.query('SELECT * FROM users WHERE email = $1', [email]);

    if (existingUserByUsername.rows.length > 0 || existingUserByEmail.rows.length > 0) {
      return NextResponse.json({ message: 'User already exists with the given username or email' }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create assistant at OpenAI
    const openaiAssistantId = await createAssistant(username);

    // Save the new user
    const newUser = await client.query(
      `INSERT INTO users (first_name, last_name, email, username, password, assistant_name, openai_assistant)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [firstName, lastName, email, username, hashedPassword, finalAssistantName, openaiAssistantId]
    );

    const userId = newUser.rows[0].id; // Get the new user's ID

    // Initialize the user's credits based on the account type
    await initializeUserCredits(client, userId, accountType);

    // Create the initial private workspace for the new user
    const newWorkspace = await client.query(
      `INSERT INTO workspaces (owner, name, type)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, 'My Workspace', 'private']
    );

    return NextResponse.json({ 
      message: 'User and workspace created successfully', 
      user: newUser.rows[0],
      workspace: newWorkspace.rows[0] 
    });
  } catch (error) {
    console.error('Error creating user and workspace:', error);
    return NextResponse.json({ message: 'Error creating user and workspace' }, { status: 500 });
  } finally {
    client.release(); // Always release the client back to the pool
  }
}

// Initialize User Credits Function
async function initializeUserCredits(client: PoolClient, userId: string, accountType: 'trial' | 'standard' | 'pro') {
  let initialCredits = 150; // Default for trial

  if (accountType === 'standard' || accountType === 'pro') {
    initialCredits = 500; // Initial credits for both standard and pro
    const subscriptionType = accountType === 'standard' ? 'standard' : 'pro';
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); // Set the next billing date to one month from now
    const nextBillingDateString = nextBillingDate.toISOString().split('T')[0];

    await client.query(
      `UPDATE users
       SET credits = $1,
           subscription_type = $2,
           subscription_start_date = NOW(),
           next_billing_date = $3,
           annual_credit_total = $4
       WHERE id = $5`,
      [initialCredits, subscriptionType, nextBillingDateString, initialCredits, userId]
    );
  } else {
    // For trial users, set trial_start_date and initialize credits without setting subscription details
    await client.query(
      `UPDATE users
       SET credits = $1,
           trial_start_date = NOW()
       WHERE id = $2`,
      [initialCredits, userId]
    );
  }
}
