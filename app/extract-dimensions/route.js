
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new NextResponse(JSON.stringify({ error: 'Only POST requests allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('image');

    if (!file) {
      return new NextResponse(JSON.stringify({ success: false, error: 'Image file not received' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the most likely width and depth dimensions in inches from this stone top or cabinet drawing. Return them as JSON like {"width": 56, "depth": 25}'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64}`,
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    const match = content.match(/\{[^}]+\}/);
    const result = match ? JSON.parse(match[0]) : null;

    if (!result) {
      return new NextResponse(JSON.stringify({ success: false, error: 'No valid JSON object found', content }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new NextResponse(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new NextResponse(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
