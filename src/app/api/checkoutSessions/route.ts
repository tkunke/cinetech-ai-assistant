import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15' as any,
});

export async function POST(req: NextRequest) {
  try {
    console.log('Received POST request from subscribe page');

    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [
        {
          price: 'price_1PozSIKHvqcq3N58yBYtbo9b',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      return_url: `${req.nextUrl.origin}/return?session_id={CHECKOUT_SESSION_ID}`,
      automatic_tax: { enabled: true },
    });

    console.log('Stripe session created:', session.id);

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('Received GET request');
    const sessionId = req.nextUrl.searchParams.get('session_id');
    console.log('Retrieved session ID:', sessionId);

    if (!sessionId) {
      console.warn('No session ID provided');
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Stripe session retrieved:', session.id);

    return NextResponse.json({
      status: session.status,
      customer_email: session.customer_details?.email || null,
    });
  } catch (err) {
    console.error('Error retrieving Stripe session:', err);
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export function DELETE(req: NextRequest) {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
