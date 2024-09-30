import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

// Updated SQL query in the resetCredits API to exclude users with canceled status

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Fetch users whose next billing date is today or earlier, are on a subscription, and have not canceled
    const usersToReset = await client.query(`
      SELECT id, credits, subscription_type, next_billing_date, annual_credit_total
      FROM users
      WHERE next_billing_date <= CURRENT_DATE 
        AND subscription_type IS NOT NULL
        AND status != 'canceled';
    `);

    for (const user of usersToReset.rows) {
      let monthlyCredits = 0;
      let maxAnnualCredits = 0;

      // Determine the monthly refresh and max annual credits based on the subscription type
      if (user.subscription_type === 'standard') {
        monthlyCredits = 150;
        maxAnnualCredits = 1500;
      } else if (user.subscription_type === 'pro') {
        monthlyCredits = 300;
        maxAnnualCredits = 2500;
      }

      // Calculate potential new annual total
      const potentialNewAnnualTotal = user.annual_credit_total + monthlyCredits;

      // Adjust credits to add if they would exceed the annual maximum
      let creditsToAdd = monthlyCredits;
      if (potentialNewAnnualTotal > maxAnnualCredits) {
        creditsToAdd = maxAnnualCredits - user.annual_credit_total;
      }

      // Update credits only if the user hasn't hit the max annual limit
      if (creditsToAdd > 0) {
        const updatedCredits = user.credits + creditsToAdd;
        const newAnnualTotal = user.annual_credit_total + creditsToAdd;

        await client.query(`
          UPDATE users
          SET credits = $1,
              annual_credit_total = $2,
              next_billing_date = next_billing_date + INTERVAL '1 month'
          WHERE id = $3;`,
          [updatedCredits, newAnnualTotal, user.id]
        );
      } else {
        // Only update the next billing date if the user has hit the annual limit
        await client.query(`
          UPDATE users
          SET next_billing_date = next_billing_date + INTERVAL '1 month'
          WHERE id = $1;`,
          [user.id]
        );
      }
    }

    // Commit the transaction
    await client.query('COMMIT');

    return NextResponse.json({ message: 'Credits reset and billing processed for eligible users.' });
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error resetting credits and processing billing:', error);
    return NextResponse.json({ message: 'Error resetting credits and processing billing' }, { status: 500 });
  } finally {
    client.release();
  }
}
