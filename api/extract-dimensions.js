
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
    const base64 = filePart?.split('base64,')[1]?.trim();

    if (!base64) {
      console.error("❌ No image base64 found in uploaded form data");
      return res.status(400).json({ success: false, error: 'Image base64 not found' });
    }

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
    console.log("🧠 GPT-4 raw response:", content);

    const match = content.match(/\{[^}]+\}/);
    if (!match) {
      console.error("❌ No valid JSON object found in GPT response");
      return res.status(500).json({ success: false, error: 'No JSON object found in GPT response', content });
    }

    const dataJson = JSON.parse(match[0]);
    console.log("✅ Parsed dimensions:", dataJson);

    res.status(200).json({ success: true, data: dataJson });

  } catch (err) {
    console.error("💥 Unexpected error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
