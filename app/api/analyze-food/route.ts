import {
  FOOD_VISION_JSON_SCHEMA,
  FOOD_VISION_SYSTEM_PROMPT,
  demoVisionResult,
  emptyVisionResult,
  parseVisionJson,
} from "@/lib/ai/vision";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { imageBase64?: string };
  const image = body.imageBase64;
  if (!image) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  const provider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!openaiKey && !geminiKey) {
    return NextResponse.json({ result: demoVisionResult(), demo: true });
  }

  try {
    const raw =
      provider === "gemini" && geminiKey
        ? await callGemini(image, geminiKey)
        : await callOpenAI(image, openaiKey ?? "");
    return NextResponse.json({ result: parseVisionJson(raw), demo: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vision failed";
    return NextResponse.json(
      { error: message, result: emptyVisionResult(message) },
      { status: 502 },
    );
  }
}

async function callOpenAI(imageBase64: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: FOOD_VISION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this meal photo. Respond with JSON matching this schema: ${JSON.stringify(FOOD_VISION_JSON_SCHEMA)}`,
            },
            { type: "image_url", image_url: { url: imageBase64 } },
          ],
        },
      ],
    }),
  });
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message || "OpenAI vision error");
  return json.choices?.[0]?.message?.content ?? "{}";
}

async function callGemini(imageBase64: string, apiKey: string): Promise<string> {
  const [, meta, data] = imageBase64.match(/^data:(.+);base64,(.+)$/) ?? [];
  const inlineData = data
    ? { mime_type: meta, data }
    : { mime_type: "image/jpeg", data: imageBase64 };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_VISION_MODEL ?? "gemini-2.0-flash"}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: FOOD_VISION_SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Analyze this meal photo. Respond with JSON matching this schema: ${JSON.stringify(FOOD_VISION_JSON_SCHEMA)}`,
              },
              { inline_data: inlineData },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message || "Gemini vision error");
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}
