import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
    const client = await pool.connect();
  try {
    const { token, newPassword } = await request.json();
    console.log('Token received from URL:', token);
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    const result = await client.query(
        'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
        [token]
    );
    console.log(`Executing query: SELECT reset_password_token, reset_password_expires FROM users WHERE reset_password_token = '${token}'`);
    console.log('Query result:', result.rows);

    // Log the token and expiration timestamp for comparison
    const dbExpires = result.rows[0].reset_password_expires;
    console.log('Token found in DB:', result.rows[0].reset_password_token);
    console.log('DB expiration timestamp:', dbExpires);
    console.log('Current server timestamp:', new Date().toISOString());
    
    // Check if the token is expired
    if (new Date() > new Date(dbExpires)) {
      console.log('Token has expired');
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }


    if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }
    
    const userId = result.rows[0].id;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    const query = 'UPDATE users SET password = $1 WHERE id = $2';
    await client.query(query, [hashedPassword, userId]);

    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
