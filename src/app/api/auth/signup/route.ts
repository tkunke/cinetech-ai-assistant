import { NextRequest, NextResponse } from 'next/server';
import { sql, QueryResult, QueryResultRow } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const { firstName, lastName, email, username, password, assistantName, defaultGreeting } = await request.json();

  // Check for missing required fields
  if (!firstName || !lastName || !email || !username || !password) {
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
      INSERT INTO users (first_name, last_name, email, username, password, assistant_name, default_greeting, credits)
      VALUES (${firstName}, ${lastName}, ${email}, ${username}, ${hashedPassword}, ${finalAssistantName}, ${finalDefaultGreeting}, 100000)
      RETURNING *
    `;

    return NextResponse.json({ message: 'User created successfully', user: newUser.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Error creating user' }, { status: 500 });
  }
}

