
import { buffer } from 'micro';
import { readFileSync } from 'fs';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);
    const boundary = req.headers['content-type'].split('boundary=')[1];
    const parts = data.toString().split(`--${boundary}`);

    const filePart = parts.find(p => p.includes('filename'));
    const base64 = filePart.split('base64,')[1].trim();
    const imageData = base64;

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
                url: `data:image/png;base64,${imageData}`,
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const match = response.choices[0].message.content.match(/\{[^}]+\}/);
    const dataJson = match ? JSON.parse(match[0]) : {};
    res.status(200).json({ success: true, data: dataJson });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}
