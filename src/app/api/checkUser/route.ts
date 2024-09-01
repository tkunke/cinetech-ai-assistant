import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ message: 'Email is required' }, { status: 400 });
  }

  try {
    const result = await sql`
      SELECT id, username FROM users WHERE email = ${email}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true, username: result.rows[0].username });
  } catch (error) {
    console.error('Error checking user email:', error);
    return NextResponse.json({ message: 'Error checking email' }, { status: 500 });
  }
}
