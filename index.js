import express from 'express';
import multer from 'multer';
import { readFile } from 'fs/promises';
import { config } from 'dotenv';
import OpenAI from 'openai';
config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

app.post('/extract-dimensions', upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const imageBuffer = await readFile(imagePath);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: "Extract the most likely width and depth dimensions in inches from this stone top or cabinet drawing. Return them as JSON like {"width": 56, "depth": 25}" },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBuffer.toString('base64')}` } }
          ]
        }
      ],
      max_tokens: 1000
    });

    const jsonMatch = response.choices[0].message.content.match(/\{[^}]+\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
