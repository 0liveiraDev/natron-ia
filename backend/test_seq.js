const axios = require('axios');
async function test() {
    try {
        const res = await axios.post('http://2.24.84.26:11434/api/chat', {
            model: 'llama3.2',
            messages: [
                { role: 'system', content: 'You are Friday.' },
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there' },
                { role: 'system', content: 'PDF content: 1234' }
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
