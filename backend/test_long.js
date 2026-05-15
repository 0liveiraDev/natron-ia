const axios = require('axios');
async function test() {
    const start = Date.now();
    try {
        const text = 'word '.repeat(500); // 500 words ~ 600 tokens
        console.log('Sending request...');
        const res = await axios.post('http://2.24.84.26:11434/api/chat', {
            model: 'llama3.2',
            messages: [{ role: 'system', content: 'Summarize: ' + text }],
            stream: false,
            options: { num_ctx: 2048, num_predict: 350 }
        }, { timeout: 120000 });
        console.log('Time taken:', (Date.now() - start)/1000, 's');
        console.log('Success:', res.data.message.content);
    } catch(e) {
        console.error('Error:', e.message);
    }
}
test();
