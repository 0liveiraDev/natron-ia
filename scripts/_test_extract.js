function extractActionsSuperRobust(text) {
    const results = [];
    let depth = 0;
    let startIdx = -1;

    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
            if (depth === 0) startIdx = i;
            depth++;
        } else if (text[i] === '}') {
            depth--;
            if (depth === 0 && startIdx !== -1) {
                const jsonStr = text.substring(startIdx, i + 1);
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed && typeof parsed === 'object' && parsed.type) {
                        const { type, payload, ...rest } = parsed;
                        results.push({ type, payload: payload || rest });
                    }
                } catch (e) {
                    // Ignore invalid JSON blocks
                }
                startIdx = -1;
            }
        }
    }
    return results;
}

const text = `
Eu registrei:
{"type": "create_transaction", "payload": {"amount": 50, "type": "saida", "description": "Pão"}}
E também:
{"type": "create_transaction", "payload": {"amount": 30, "type": "saida", "description": "Farmácia"}}
Mas não teve ACTION prefixado.
`;

console.log(extractActionsSuperRobust(text));
