import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies

// --- IMPORTANT ---
// Coolify will set this environment variable for you.
// DO NOT hardcode your key here.
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("FATAL ERROR: GEMINI_API_KEY environment variable is not set.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// --- API ENDPOINTS ---

app.post('/api/ai/generate-campaign', async (req, res) => {
    // ... (The full logic from my previous response for this endpoint)
});

app.post('/api/ai/subject-suggestions', async (req, res) => {
    // ... (The full logic from my previous response for this endpoint)
});

app.post('/api/ai/improve-body', async (req, res) => {
    // ... (The full logic from my previous response for this endpoint)
});

app.post('/api/ai/best-send-time', async (req, res) => {
    // ... (The full logic from my previous response for this endpoint)
});

// Health check endpoint
app.get('/', (req, res) => {
    res.send('AI Proxy is running!');
});

// --- START THE SERVER ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`AI proxy server listening on port ${PORT}`);
});
