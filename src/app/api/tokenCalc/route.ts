import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET handler to fetch credits
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  const runId = request.nextUrl.searchParams.get('runId');

  if (!runId) {
    console.error("Run ID not provided");
    return NextResponse.json({ error: "Run ID not provided" }, { status: 400 });
  }

  try {
    // Query to fetch total credits and related token usage information
    const query = 'SELECT total_tokens, total_credits, prompt_tokens_cost, completion_tokens_cost, total_cost FROM token_usage WHERE run_id = $1';
    const result = await client.query(query, [runId]);

    if (result.rows.length === 0) {
      console.error(`Credits info not found for run ID: ${runId}`);
      return NextResponse.json({ error: "Credits info not found" }, { status: 404 });
    }

    const tokenUsageInfo = result.rows[0];
    console.log(`Retrieved token usage info for runId ${runId}:`, tokenUsageInfo);
    console.log('Type of total_credits:', typeof tokenUsageInfo.total_credits); // Log type for verification

    return NextResponse.json({ 
        tokenUsage: {
            ...tokenUsageInfo,
            total_credits: Number(tokenUsageInfo.total_credits) // Ensure it's a number
        } 
    });
  } catch (error) {
    console.error('Error fetching token usage info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
