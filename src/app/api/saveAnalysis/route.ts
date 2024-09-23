import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function POST(req: NextRequest) {
    const client = await pool.connect();
    try {
        const { threadId, topics, keywords, summary } = await req.json();

        // First, check if an entry already exists
        const existingEntry = await client.query(
            'SELECT * FROM thread_analysis WHERE thread_id = $1',
            [threadId]
        );

        let result;
        if (existingEntry.rows.length > 0) {
            // Update the existing entry
            result = await client.query(
                'UPDATE thread_analysis SET topics = $2, keywords = $3, summary = $4 WHERE thread_id = $1 RETURNING *',
                [threadId, JSON.stringify(topics), JSON.stringify(keywords), JSON.stringify(summary)]
            );
        } else {
            // Insert a new entry if no existing entry is found
            result = await client.query(
                'INSERT INTO thread_analysis (thread_id, topics, keywords, summary) VALUES ($1, $2, $3, $4) RETURNING *',
                [threadId, JSON.stringify(topics), JSON.stringify(keywords), JSON.stringify(summary)]
            );
        }

        return NextResponse.json({ message: 'Analysis saved successfully', data: result.rows[0] }, { status: 200 });
    } catch (error) {
        console.error('Failed to save analysis:', error);
        return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    } finally {
        client.release();
    }
}

export async function GET(req: NextRequest) {
    const client = await pool.connect();
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');

    try {
        const result = await client.query('SELECT * FROM thread_analysis WHERE thread_id = $1', [threadId]);

        if (result.rows.length > 0) {
            return NextResponse.json(result.rows[0], { status: 200 });
        } else {
            return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
        }
    } catch (error) {
        console.error('Failed to retrieve analysis:', error);
        return NextResponse.json({ error: 'Failed to retrieve analysis' }, { status: 500 });
    }
}
