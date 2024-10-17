import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai/index.mjs';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

// Define a schema for the milestones (production phases)
const MilestoneSchema = z.object({
  phase: z.string(),
  startDate: z.string(),  // String for simplicity, you could use z.date() if you want to enforce date parsing
  endDate: z.string(),
  description: z.string(),
});

const ProductionScheduleSchema = z.object({
  schedule: z.array(MilestoneSchema),
});

export async function POST(request: NextRequest) {
  const openai = new OpenAI();

  try {
    const formData = await request.formData();
    const projectDetails = formData.get('projectDetails');

    if (!projectDetails || typeof projectDetails !== 'string') {
      return NextResponse.json({ error: 'Invalid project details provided' }, { status: 400 });
    }

    // Structured prompt for OpenAI
    const assistantPrompt = `
      You are an expert at creating production schedules. Based on the following project details, create a production schedule and return it in the following JSON format:
      {
        "schedule": [
          { "phase": "Phase Name", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "description": "Phase description" }
        ]
      }

      Here are the project details: ${projectDetails}
    `;

    console.log('Sending prompt to OpenAI:', assistantPrompt.slice(0, 500));

    // Call OpenAI with structured output
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-2024-08-06',
      messages: [{ role: 'user', content: assistantPrompt }],
      response_format: zodResponseFormat(ProductionScheduleSchema, 'production_schedule'),
    });

    // Check if parsed result exists and is not null
    const parsedResponse = completion.choices[0]?.message?.parsed;
    
    if (!parsedResponse || !parsedResponse.schedule) {
      console.error('No valid schedule found in the response.');
      return NextResponse.json({ error: 'Failed to generate schedule' }, { status: 500 });
    }

    const milestones = parsedResponse.schedule;
    console.log('Parsed production schedule:', milestones);

    // Return the validated milestones in the response
    return NextResponse.json({ milestones });

  } catch (error) {
    console.error('Error generating schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
