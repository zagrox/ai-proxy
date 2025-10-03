import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
app.use(express.json());

// --- CORS Configuration ---
// This is critical for security. It ensures that only your frontend application
// can make requests to this API. You MUST set the FRONTEND_ORIGIN environment
// variable in your Coolify settings.
const frontendOrigin = process.env.FRONTEND_ORIGIN;
if (!frontendOrigin) {
    console.error("FATAL ERROR: FRONTEND_ORIGIN environment variable is not set.");
    process.exit(1);
}
app.use(cors({ origin: frontendOrigin }));

// --- Gemini API Key Setup ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("FATAL ERROR: GEMINI_API_KEY environment variable is not set.");
    process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

const handleError = (res, error, context) => {
    console.error(`Error in ${context}:`, error);
    res.status(500).json({ error: `An error occurred in ${context}.` });
};

// --- API ENDPOINTS ---

app.post('/api/ai/generate-campaign', async (req, res) => {
    const { userPrompt, categories } = req.body;
    if (!userPrompt || !categories || !Array.isArray(categories)) {
        return res.status(400).json({ error: 'userPrompt and categories are required.' });
    }

    const categoriesString = categories.map(c => `ID: "${c.id}", Name: "${c.name_fa}", Description: Members interested in ${c.name_en}`).join('; ');
    const systemInstruction = `You are an expert marketing campaign creator for an Iranian audience, speaking Persian. Your goal is to generate a complete campaign draft in JSON format.
- Analyze the user's prompt to understand the campaign goal.
- Select the MOST relevant audience category from the provided list based on the prompt.
- Create a compelling, primary subject line (subject).
- Create a slightly different, alternative subject line for A/B testing (subjectB).
- Write a concise, engaging, and professional email body (body). Use placeholders like {{firstName}} for personalization. The tone should be appropriate for the campaign goal.
- Suggest an optimal send time in "HH:MM" format (sendTime).
- Your entire output MUST be a single, valid JSON object and nothing else.`;

    const prompt = `User Goal: "${userPrompt}"\n\nAvailable Audience Categories: [${categoriesString}]`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        audienceCategoryId: { type: Type.STRING },
                        subject: { type: Type.STRING },
                        subjectB: { type: Type.STRING },
                        body: { type: Type.STRING },
                        sendTime: { type: Type.STRING, pattern: "^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$" }
                    },
                    required: ["audienceCategoryId", "subject", "subjectB", "body", "sendTime"]
                },
            },
        });
        const jsonText = response.text.trim();
        res.json(JSON.parse(jsonText));
    } catch (error) {
        handleError(res, error, 'generate-campaign');
    }
});

app.post('/api/ai/subject-suggestions', async (req, res) => {
    const { context } = req.body;
    if (!context) {
        return res.status(400).json({ error: 'context (email body) is required.' });
    }

    const systemInstruction = `You are a Persian email marketing expert. Based on the email body provided, generate 3 diverse and compelling subject line suggestions. The output must be a valid JSON object.`;
    const prompt = `Email Body: "${context}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["suggestions"]
                },
            },
        });
        const jsonText = response.text.trim();
        res.json(JSON.parse(jsonText));
    } catch (error) {
        handleError(res, error, 'subject-suggestions');
    }
});

app.post('/api/ai/improve-body', async (req, res) => {
    const { emailBody } = req.body;
    if (!emailBody) {
        return res.status(400).json({ error: 'emailBody is required.' });
    }
    const prompt = `Improve this Persian email body to be more engaging, professional, and clear. Do not change the core message. Keep personalization placeholders like {{firstName}}.
Email Body: "${emailBody}"`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        res.json({ improvedBody: response.text });
    } catch (error) {
        handleError(res, error, 'improve-body');
    }
});

app.post('/api/ai/best-send-time', async (req, res) => {
    const { audienceDescription } = req.body;
    if (!audienceDescription) {
        return res.status(400).json({ error: 'audienceDescription is required.' });
    }
    const prompt = `For an Iranian audience described as "${audienceDescription}", what is the best day and time to send a marketing email for maximum engagement? Provide a concise suggestion, for example: "Saturday at 10:00 AM" or "Monday evening around 6:30 PM".`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        res.json({ suggestion: response.text });
    } catch (error) {
        handleError(res, error, 'best-send-time');
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.send('AI Proxy is running!');
});

// --- START THE SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`AI proxy server listening on port ${PORT}`);
});
