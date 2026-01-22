export const config = {
    port: process.env.PORT || 3001,
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    dbPath: process.env.DB_PATH || './data/chat.db'
};

if (!config.openaiApiKey) {
    console.warn('⚠️  OPENAI_API_KEY not set. Set it in your environment or create a .env file.');
}
