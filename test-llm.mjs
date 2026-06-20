import { createRequire } from 'module';
import { execSync } from 'child_process';

// Quick test: call the LLM API directly using the env vars
const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

if (!apiUrl || !apiKey) {
  console.error('Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY');
  process.exit(1);
}

console.log('API URL:', apiUrl);
console.log('Testing LLM with json_object response_format...');

const res = await fetch(`${apiUrl}/v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-5-mini',
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Respond only with valid JSON.' },
      { role: 'user', content: 'Return a JSON object with a "status" field set to "ok" and a "message" field saying "LLM working".' }
    ],
    response_format: { type: 'json_object' },
  }),
});

const data = await res.json();
if (!res.ok) {
  console.error('LLM API error:', JSON.stringify(data, null, 2));
  process.exit(1);
}

const content = data.choices?.[0]?.message?.content;
console.log('Response:', content);
console.log('Model used:', data.model);
console.log('SUCCESS: LLM is working correctly');
