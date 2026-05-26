const apiKey = process.env.OPENAI_API_KEY;
const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.stepfun.com/v1').replace(/\/$/, '');
const model = process.env.OPENAI_DEFAULT_MODEL || 'step-3.6';

if (!apiKey) {
  console.error('OPENAI_API_KEY is required for a live Step AI smoke test.');
  process.exit(2);
}

const response = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model,
    messages: [
      { role: 'system', content: 'Return compact JSON only.' },
      {
        role: 'user',
        content:
          'Return exactly {"summary":"Incident Room AI smoke ok","likelyPattern":"live OpenAI-compatible chat completion","recommendedActionPack":"none","moderatorCaveats":["manual review"]}',
      },
    ],
    temperature: 0,
    max_tokens: 120,
  }),
});

if (!response.ok) {
  console.error(`AI smoke failed with HTTP ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

const json = await response.json();
const content = json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? '';
if (!content) {
  const message = json.choices?.[0]?.message ?? {};
  console.error(
    JSON.stringify({
      ok: false,
      status: response.status,
      choiceKeys: Object.keys(json.choices?.[0] ?? {}),
      messageKeys: Object.keys(message),
    })
  );
  process.exit(1);
}

console.log(content.slice(0, 240));
