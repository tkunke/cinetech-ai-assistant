import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to update a production schedule
export async function updateProductionSchedule(assistantId: string, updates: any): Promise<boolean> {
  const client = await pool.connect();

  try {
    console.log(`Updating schedule for assistant ID: ${assistantId}`);

    // Fetch the current schedule
    const query = `
      SELECT schedule_data 
      FROM user_schedules 
      WHERE assistant_id = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const result = await client.query(query, [assistantId]);

    if (result.rows.length === 0) {
      console.error('No schedule found for the given assistant ID.');
      return false;
    }

    // Parse the existing schedule
    let scheduleData = result.rows[0].schedule_data;
    console.log('Current schedule data:', scheduleData);

    // Find the phase to update or add a new phase if it doesn't exist
    const phaseIndex = scheduleData.findIndex((phase: any) => phase.phase === updates.phase);
    
    if (phaseIndex !== -1) {
      console.log(`Updating phase: ${updates.phase}`);
      // Update the existing phase
      if (updates.startDate) {
        console.log(`Updating start date to: ${updates.startDate}`);
        scheduleData[phaseIndex].startDate = updates.startDate;
      }
      if (updates.endDate) {
        console.log(`Updating end date to: ${updates.endDate}`);
        scheduleData[phaseIndex].endDate = updates.endDate;
      }
      if (updates.description) {
        console.log(`Updating description to: ${updates.description}`);
        scheduleData[phaseIndex].description = updates.description;
      }
    } else {
      console.log(`Adding new phase: ${updates.phase}`);
      // Add a new phase if it doesn't exist
      const newPhase = {
        phase: updates.phase,
        startDate: updates.startDate || '',
        endDate: updates.endDate || '',
        description: updates.description || ''
      };
      scheduleData.push(newPhase);
    }

    console.log('Updated schedule data:', scheduleData);

    // Ensure scheduleData is properly formatted as a JSON string
    const scheduleDataString = JSON.stringify(scheduleData);

    // Update the schedule in the database
    const updateQuery = `
      UPDATE user_schedules 
      SET schedule_data = $1
      WHERE assistant_id = $2;
    `;
    const updateResult = await client.query(updateQuery, [scheduleDataString, assistantId]);

    if (updateResult.rowCount === 1) {
      console.log('Schedule updated successfully.');
      return true;
    } else {
      console.error('Failed to update the schedule.');
      return false;
    }

  } catch (error) {
    console.error('Error updating production schedule:', error);
    return false;
  } finally {
    client.release();
  }
}
