import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const user = await kv.get<{ id: string; data: any }>(params.userId);
  return NextResponse.json(user);
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const userData = await request.json();
  await kv.set(params.userId, userData);
  return NextResponse.json({ message: 'User data saved successfully!' });
}
