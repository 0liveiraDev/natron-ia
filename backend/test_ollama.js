const axios = require('axios');
const OLLAMA_URL = 'http://2.24.84.26:11434';
const MODEL_NAME = 'llama3.2';
async function test() {
    try {
        console.log('Sending request to Ollama...');
        const res = await axios.post(`${OLLAMA_URL}/api/chat`, {
            model: MODEL_NAME,
            messages: [{ role: 'system', content: 'You are a bot.' }, { role: 'user', content: 'Hello' }],
            stream: false,
            options: { num_ctx: 2048, num_predict: 350, temperature: 0.3, top_p: 0.9, repeat_penalty: 1.1 }
        }, { timeout: 60000 });
        console.log('Success:', res.data.message.content);
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error('Data:', e.response.data);
    }
}
test();
