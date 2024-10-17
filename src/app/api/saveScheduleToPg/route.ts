import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initialize the PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// POST: Save a new schedule
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { userId, schedule } = await request.json();

    const scheduleJson = JSON.stringify(schedule);

    const query = `
      INSERT INTO user_schedules (user_id, schedule_data)
      VALUES ($1, $2::jsonb)  -- Ensures PostgreSQL treats the value as JSONB
      RETURNING id;
    `;

    const result = await client.query(query, [userId, scheduleJson]);

    // Return the newly created schedule ID
    return NextResponse.json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error saving schedule:', error);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  } finally {
    client.release();
  }
}

// Handle GET request to fetch user schedules
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const userId = request.nextUrl.searchParams.get('userId'); // Fetch userId from the query parameters

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const query = `
      SELECT id, name, schedule_data
      FROM user_schedules
      WHERE user_id = $1
    `;
    const result = await client.query(query, [userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No schedules found' }, { status: 404 });
    }

    // Send the schedules as response
    return NextResponse.json({ schedules: result.rows });

  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  } finally {
    client.release();
  }
}

// PUT: Update an existing schedule
export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { scheduleId, schedule, userId } = await request.json();

    const query = `
      UPDATE user_schedules
      SET schedule_data = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING schedule_data;
    `;
    const result = await client.query(query, [schedule, scheduleId, userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ schedule: result.rows[0].schedule_data });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  } finally {
    client.release();
  }
}
