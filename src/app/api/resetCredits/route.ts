import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    // Fetch users whose next billing date is today or earlier and are on a subscription
    const usersToReset = await sql`
      SELECT id, credits, subscription_type, next_billing_date, annual_credit_total
      FROM users
      WHERE next_billing_date <= CURRENT_DATE AND subscription_type IS NOT NULL;
    `;

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

      // Calculate potential new total credits
      const potentialNewCreditTotal = user.credits + monthlyCredits;
      const potentialNewAnnualTotal = user.annual_credit_total + monthlyCredits;

      // Adjust credits to add if they would exceed the annual maximum
      let creditsToAdd = monthlyCredits;
      if (potentialNewAnnualTotal > maxAnnualCredits) {
        creditsToAdd = maxAnnualCredits - user.annual_credit_total;
      }

      // If credits can be added without exceeding the max, update the user's credit balance
      if (creditsToAdd > 0) {
        const updatedCredits = user.credits + creditsToAdd;
        const newAnnualTotal = user.annual_credit_total + creditsToAdd;

        await sql`
          UPDATE users
          SET credits = ${updatedCredits},
              next_billing_date = next_billing_date + INTERVAL '1 month',
              annual_credit_total = ${newAnnualTotal}
          WHERE id = ${user.id};
        `;
      }
    }

    return NextResponse.json({ message: 'Credits reset successfully for eligible users.' });
  } catch (error) {
    console.error('Error resetting credits:', error);
    return NextResponse.json({ message: 'Error resetting credits' }, { status: 500 });
  }
}
