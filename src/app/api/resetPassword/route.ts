// /api/resetPassword/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { randomBytes } from 'crypto';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

function generateResetToken(): string {
    return randomBytes(32).toString('hex'); // Generates a 64-character token
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

export async function POST(request: NextRequest) {
    const client = await pool.connect();
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const userResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
    );

    if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;
    // Generate a password reset token (could be a JWT, or a unique string)
    const resetToken = generateResetToken();
    const expirationTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await client.query(
        `UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3`,
        [resetToken, expirationTime, userId]
    );
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${resetToken}`;

    // Send the email
    const msg = {
      to: email,
      from: 'no-reply@cinetechai.com',
      subject: 'Password Reset Request',
      text: `You requested a password reset. Please use the following link: ${resetUrl}`,
      html: `<strong>You requested a password reset. Please use the following link:</strong><br /><a href="${resetUrl}">${resetUrl}</a>`,
    };

    await sgMail.send(msg);

    return NextResponse.json({ message: 'Password reset email sent.' }, { status: 200 });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return NextResponse.json({ error: 'Failed to send password reset email' }, { status: 500 });
  }
}
