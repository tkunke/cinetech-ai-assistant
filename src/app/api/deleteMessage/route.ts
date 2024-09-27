import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  const { threadId, messageId } = await req.json();  // Parse JSON body

  if (!threadId || !messageId) {
    return NextResponse.json({ error: 'Missing threadId or messageId' }, { status: 400 });
  }

  try {
    const deletedMessage = await openai.beta.threads.messages.del(threadId, messageId);
    console.log('Deleted message:', deletedMessage);

    return NextResponse.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
