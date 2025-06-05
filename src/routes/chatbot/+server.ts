import { error, json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '$env/dynamic/private';

export const prerender = false; // Disable prerendering for this route

export async function POST({ request }) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      throw error(400, 'Prompt is required and must be a string');
    }

    const genAI = new GoogleGenerativeAI(env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const fitnessPrompt = `You are a fitness and health expert named FitBot. Provide accurate, practical, and safe advice for the following query: ${prompt}. Ensure the response is concise, conversational, and formatted in Markdown for a chat interface. Use a friendly tone, avoid overly technical jargon, and include bullet points, headings, or code blocks where appropriate.`;

    const result = await model.generateContent(fitnessPrompt);
    const response = await result.response;
    const text = response.text();

    return json({ response: text });
  } catch (err) {
    console.error('Error calling Gemini API:', err);
    throw error(500, 'Failed to get response from FitBot');
  }
}   