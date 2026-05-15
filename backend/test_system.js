const axios = require('axios');
async function test() {
    try {
        const res = await axios.post('http://2.24.84.26:11434/api/chat', {
            model: 'llama3.2',
            messages: [
                { role: 'system', content: 'You are Friday.' },
                { role: 'system', content: 'PDF content: Hello' },
                { role: 'user', content: 'What is it?' }
            ],
            stream: false
        });
        console.log('Success:', res.data.message.content);
    } catch(e) {
        console.error('Error:', e.message);
        if(e.response) console.error(JSON.stringify(e.response.data));
    }
}
test();
