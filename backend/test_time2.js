const axios = require('axios');
async function test() {
    const start = Date.now();
    try {
        const text = 'word '.repeat(500);
        console.log('Sending request...');
        const res = await axios.post('http://2.24.84.26:11434/api/chat', {
            model: 'llama3.2',
            messages: [{ role: 'user', content: 'Resuma isto: ' + text }],
            stream: false,
            options: { num_ctx: 2048, num_predict: 350 }
        }, { timeout: 120000 });
        console.log('Time taken:', (Date.now() - start)/1000, 's');
        console.log('Success:', res.data.message.content.substring(0, 50));
    } catch(e) {
        console.error('Error:', e.message);
    }
}
test();
