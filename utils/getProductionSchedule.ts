import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Utility function to retrieve production schedule by assistant_id
export async function getProductionSchedule(assistantId: string): Promise<string | null> {
  const client = await pool.connect();

  try {
    const query = `
      SELECT schedule_data 
      FROM user_schedules 
      WHERE assistant_id = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const result = await client.query(query, [assistantId]);

    if (result.rows.length === 0) {
      return null;  // No schedule found for the given assistant_id
    }

    // Convert the schedule_data JSONB to a string
    const scheduleData = JSON.stringify(result.rows[0].schedule_data);
    return scheduleData;

  } catch (error) {
    console.error('Error retrieving production schedule:', error);
    return null;
  } finally {
    client.release();
  }
}
