import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: NextRequest) {
  const { firstName, lastName, email, username, password, assistantName, defaultGreeting } = await request.json();

  // Check if the user already exists by email or username to avoid duplicates
  const existingUser = await kv.get(`user:${username}`) || await kv.get(`email:${email}`);
  if (existingUser) {
    return NextResponse.json({ message: 'User already exists with the given username or email' }, { status: 400 });
  }

  // Save the new user
  const userData = {
    firstName,
    lastName,
    email,
    username,
    password, // Note: Store hashed passwords in production using bcrypt, argon2, etc.
    assistantName,
    defaultGreeting,
    tokens: 100000 // Initial token count
  };

  // Save user data by username and email for unique indexing
  await kv.set(`user:${username}`, JSON.stringify(userData));
  await kv.set(`email:${email}`, JSON.stringify(userData));

  return NextResponse.json({ message: 'User created successfully' });
}
