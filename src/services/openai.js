const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const explainTaskToDeveloper = async (taskDetails) => {
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API Key is missing. Please add it to your .env.local file.');
    }

    const prompt = `
You are a senior technical lead. Explain strictly and concisely what the developer needs to do for the following Agile Work Item.
Keep it practical, actionable, and strip out unnecessary fluff. Format it in a clean markdown style.

Task Type: ${taskDetails.type}
Title: ${taskDetails.title}
Assigned Developer: ${taskDetails.assignedTo}
Description:
${taskDetails.description}

Please provide:
1. A brief summary of the core objective
2. Step-by-step actionable items to complete it
`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch AI explanation: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error generating AI explanation:', error);
        throw error;
    }
};

export const generateUIFilesCode = async (taskDetails) => {
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API Key is missing. Cannot generate code.');
    }

    const prompt = `
You are an expert Frontend Developer using the "Fabricator" framework. 
The user has requested to create UI files for the following task.
Your goal is to generate pure HTML, CSS, and structural JS appropriate for this task.

Task Details:
Title: ${taskDetails.title}
Type: ${taskDetails.type}
Description:
${taskDetails.description}

REQUIREMENTS:
- Use Bootstrap grid system extensively and properly.
- Include specific sizing, typography, and professional color schemes.
- Provide the output ONLY as a valid JSON object with EXACTLY three keys: "html", "css", and "js". Do NOT wrap the JSON in markdown code blocks.
- The "html" key contains the HTML structure without full <html> tags (just the components).
- The "css" key contains the CSS styles.
- The "js" key contains vanilla JavaScript functionality.
`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) throw new Error('Failed to generate code.');
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    } catch (err) {
        console.error('Error fetching code:', err);
        throw err;
    }
};
