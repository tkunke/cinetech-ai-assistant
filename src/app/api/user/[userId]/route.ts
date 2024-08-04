import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const userQuery = await sql`SELECT * FROM users WHERE id = ${params.userId}`;
    const user = userQuery.rows[0];

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ message: 'Error fetching user' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const userData = await request.json();
    const { firstName, lastName, email, username, assistantName, defaultGreeting, credits } = userData;

    // Update user data in the database
    await sql`
      UPDATE users
      SET
        first_name = ${firstName},
        last_name = ${lastName},
        email = ${email},
        username = ${username},
        assistant_name = ${assistantName},
        default_greeting = ${defaultGreeting},
        credits = ${credits}
      WHERE id = ${params.userId}
    `;

    return NextResponse.json({ message: 'User data saved successfully!' });
  } catch (error) {
    console.error('Error saving user data:', error);
    return NextResponse.json({ message: 'Error saving user data' }, { status: 500 });
  }
}
