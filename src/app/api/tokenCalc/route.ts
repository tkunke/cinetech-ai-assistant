import { NextRequest, NextResponse } from 'next/server';

// Simulated in-memory store for credits (replace with a database in production)
interface TokenCostStore {
  [runId: string]: {
    total_tokens: number;
    total_credits: number;  // Converted and rounded to credits
    prompt_tokens_cost: number;
    completion_tokens_cost: number;
    total_cost: number;
  };
}

const tokenCostStore: TokenCostStore = {};

// POST handler to calculate credits based on token usage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runId, prompt_tokens, completion_tokens, imageGenerated } = body;

    console.log('Received POST request with data:', { runId, prompt_tokens, completion_tokens, imageGenerated });

    if (!runId || typeof runId !== 'string') {
      console.error('Invalid or missing runId:', { runId });
      return NextResponse.json({ error: 'Invalid or missing runId' }, { status: 400 });
    }

    // Calculate the cost for prompt tokens and completion tokens
    const prompt_tokens_cost = (prompt_tokens / 1000) * 0.005;
    const completion_tokens_cost = (completion_tokens / 1000) * 0.015;

    // Calculate the total cost
    const total_cost = prompt_tokens_cost + completion_tokens_cost;

    // Calculate the total credits consumed, rounded down to the nearest whole number
    let total_credits = Math.floor(total_cost / 0.02);

    // Add 2 credits if an image was generated
    if (imageGenerated) {
      total_credits += 2;
    }

    // Store the credit information in the in-memory store (or wherever you store it)
    tokenCostStore[runId] = {
      total_tokens: prompt_tokens + completion_tokens,
      total_credits,
      prompt_tokens_cost,
      completion_tokens_cost,
      total_cost,
    };

    console.log('tokenCostStore updated:', JSON.stringify(tokenCostStore, null, 2));

    return NextResponse.json({ message: 'Credit calculation successful', data: tokenCostStore[runId] }, { status: 200 });
  } catch (error) {
    console.error('Error processing credit calculation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET handler to fetch credits (this should be used by the token-counter component)
export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get('runId');

  if (!runId) {
    console.error("Run ID not provided");
    return NextResponse.json({ error: "Run ID not provided" }, { status: 400 });
  }

  const creditsInfo = tokenCostStore[runId];
  console.log(`Retrieved creditsInfo for runId ${runId}:`, creditsInfo);
  if (!creditsInfo) {
    console.error(`Credits info not found for run ID: ${runId}`);
    return NextResponse.json({ error: "Credits info not found" }, { status: 404 });
  }

  return NextResponse.json({ credits: creditsInfo.total_credits });
}
