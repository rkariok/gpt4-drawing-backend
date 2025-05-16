
import { IncomingForm } from 'formidable';
import fs from 'fs';
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

  const form = new IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to parse form' });
    }

    try {
      const file = files.image;
      if (!file || !file[0]) {
        return res.status(400).json({ success: false, error: 'No image file found in upload' });
      }

      const fileBuffer = fs.readFileSync(file[0].filepath);
      const base64 = fileBuffer.toString('base64');

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
        return res.status(500).json({ success: false, error: 'No valid JSON found', content });
      }

      res.status(200).json({ success: true, data: result });

    } catch (error) {
      console.error('GPT-4 error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
