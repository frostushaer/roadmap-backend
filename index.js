
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();
const app = express();
app.use(cors({
  origin: '*', // or use process.env.FRONTEND_ORIGIN for flexibility
  methods: ['GET', 'POST'],
  credentials: false
}));
app.use(express.json());

app.post('/api/roadmap', async (req, res) => {
  try {
    const profile = req.body.profile;
    const prompt = `
You are an expert roadmap generator.
Given the following user profile, generate a frontend development roadmap.

Requirements:
- Output ONLY a valid JSON object with two properties:
  - "nodes": RoadmapNode[]
  - "edges": RoadmapEdge[]
- Do NOT include any explanation, markdown, or code block.
- The JSON must match the following TypeScript types:

type RoadmapNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
};
type RoadmapEdge = {
  id: string;
  source: string;
  target: string;
};

Example Output:
{
  "nodes": [
    {
      "id": "1",
      "type": "start",
      "position": { "x": 400, "y": 50 },
      "data": {
        "label": "Start Your Journey",
        "description": "Welcome to your ${profile.goals?.targetRole || 'target role'} roadmap!",
        "difficulty": "beginner"
      }
    }
    // ...more nodes
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" }
    // ...more edges
  ]
}

User profile: ${JSON.stringify(profile)}
`;
    const chatCompletion = await client.chat.completions.create({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    let roadmap;
    try {
      roadmap = JSON.parse(chatCompletion.choices[0].message.content);
    } catch (e) {
      return res.status(500).json({ error: "LLM did not return valid JSON." });
    }
    res.json(roadmap);
    // console.log(roadmap);
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- /api/course endpoint ---
app.post('/api/course', async (req, res) => {
  try {
    const roadmapNodes = req.body.roadmapNodes || [];
    const prompt = `
You are an expert course designer. Given the following roadmap nodes, generate a course curriculum as a JSON object with a 'modules' property (CourseModule[]).
Each module should include: id, title, description, duration, difficulty, topics (with id, title, description, content, videoUrl, flashcards, mcqs, resources, estimatedTime).
For each module, generate topics using these titles: ["Introduction and Overview", "Core Concepts", "Practical Implementation", "Best Practices", "Advanced Techniques", "Real-world Applications"].
For each topic, generate content in markdown, a videoUrl (use 'dQw4w9WgXcQ' as placeholder), flashcards (with front, back, difficulty), and MCQs (with question, options, correctAnswer, explanation).
Return ONLY valid JSON. Do not include markdown or explanation outside the JSON.

TypeScript types:
type CourseModule = {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: string;
  topics: CourseTopic[];
};
type CourseTopic = {
  id: string;
  title: string;
  description: string;
  content: string;
  videoUrl: string;
  flashcards: Array<{ id: string; front: string; back: string; difficulty: string }>;
  mcqs: Array<{ id: string; question: string; options: string[]; correctAnswer: number; explanation: string }>;
  resources: any[];
  estimatedTime: string;
};

Roadmap nodes:
${JSON.stringify(roadmapNodes)}
`;
    const chatCompletion = await client.chat.completions.create({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    let modules;
    try {
      // Try to extract valid JSON from LLM output
      const content = chatCompletion.choices[0].message.content;
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        modules = parsed.modules;
      } else {
        throw new Error("LLM did not return valid JSON.");
      }
    } catch (e) {
      return res.status(500).json({ error: "LLM did not return valid JSON." });
    }
    res.json({ modules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_API_KEY,
});
