import { Tool, ToolContext, ToolResult } from './index.js';
import { dbRun } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({
    apiKey: config.openaiApiKey
});

export const createPageTool: Tool = {
    name: 'create_page',
    description: `Creates a functional page or mini-app based on user requirements. Use this tool when the user wants to build something visual like:
- A form (contact, feedback, signup, survey)
- A dashboard or data display
- A landing page or marketing page
- A calculator or interactive tool
- A list, table, or card layout
- Any custom UI component

The tool uses AI to generate complete, custom HTML tailored to the user's specific needs.`,
    inputSchema: {
        type: 'object',
        properties: {
            pageType: {
                type: 'string',
                enum: ['form', 'dashboard', 'landing', 'calculator', 'list', 'custom'],
                description: 'The type of page to create'
            },
            title: {
                type: 'string',
                description: 'The title or name of the page'
            },
            description: {
                type: 'string',
                description: 'Detailed description of what the page should contain and do'
            },
            colorScheme: {
                type: 'string',
                enum: ['light', 'dark', 'blue', 'green', 'purple'],
                description: 'Color scheme for the page (optional, defaults to dark)'
            }
        },
        required: ['pageType', 'title', 'description']
    },
    $run: async (input: {
        pageType: string;
        title: string;
        description: string;
        colorScheme?: string;
    }, context: ToolContext): Promise<ToolResult> => {
        try {
            const id = uuidv4();
            const colorScheme = input.colorScheme || 'dark';

            // Generate page HTML using AI
            const html = await generatePageWithAI(input.pageType, input.title, input.description, colorScheme);

            // Save to database
            dbRun(
                `INSERT INTO pages (id, user_id, title, page_type, description, html_content, color_scheme) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, context.userId, input.title, input.pageType, input.description, html, colorScheme]
            );

            return {
                success: true,
                data: {
                    pageId: id,
                    title: input.title,
                    pageType: input.pageType,
                    message: `Page "${input.title}" created successfully!`,
                    previewHtml: html
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to create page: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
};

async function generatePageWithAI(pageType: string, title: string, description: string, colorScheme: string): Promise<string> {
    // Blocks Brand Color Schemes
    const colorSchemes: Record<string, { bg: string; card: string; text: string; accent: string; secondary: string; tertiary: string; muted: string; border: string }> = {
        dark: {
            bg: '#1a1a2e',
            card: 'rgba(255, 255, 255, 0.05)',
            text: '#ffffff',
            accent: '#69D2E7',      // Blocks primary blue
            secondary: '#FF6B6B',   // Blocks coral
            tertiary: '#1ABC9C',    // Blocks green
            muted: '#8c8c8c',
            border: 'rgba(255, 255, 255, 0.1)'
        },
        light: {
            bg: '#ffffff',
            card: '#fafafa',
            text: '#1a1a2e',
            accent: '#69D2E7',
            secondary: '#FF6B6B',
            tertiary: '#1ABC9C',
            muted: '#5c5c6d',
            border: '#e8e8e8'
        },
        blue: {
            bg: '#1a1a2e',
            card: 'rgba(105, 210, 231, 0.1)',
            text: '#ffffff',
            accent: '#69D2E7',
            secondary: '#5DADE2',
            tertiary: '#1ABC9C',
            muted: '#b3b3b3',
            border: 'rgba(105, 210, 231, 0.3)'
        },
        green: {
            bg: '#1a1a2e',
            card: 'rgba(26, 188, 156, 0.1)',
            text: '#ffffff',
            accent: '#1ABC9C',
            secondary: '#69D2E7',
            tertiary: '#00C853',
            muted: '#b3b3b3',
            border: 'rgba(26, 188, 156, 0.3)'
        },
        purple: {
            bg: '#1a1a2e',
            card: 'rgba(255, 107, 107, 0.1)',
            text: '#ffffff',
            accent: '#FF6B6B',
            secondary: '#69D2E7',
            tertiary: '#1ABC9C',
            muted: '#b3b3b3',
            border: 'rgba(255, 107, 107, 0.3)'
        }
    };

    const colors = colorSchemes[colorScheme] || colorSchemes.dark;

    const prompt = `You are a web developer creating a beautiful, functional HTML page. Generate ONLY the complete HTML code for the following request.

PAGE TYPE: ${pageType}
TITLE: ${title}

USER'S REQUIREMENTS (FOLLOW THESE EXACTLY):
${description}

DEFAULT COLOR SCHEME (use ONLY if user didn't specify colors):
- Background: ${colors.bg}
- Card/Container background: ${colors.card}
- Text: ${colors.text}
- Primary/Accent: ${colors.accent}
- Secondary accent: ${colors.secondary}
- Tertiary accent: ${colors.tertiary}
- Gradient: linear-gradient(135deg, #FF6B6B 0%, #69D2E7 50%, #1ABC9C 100%)
- Muted text: ${colors.muted}
- Borders: ${colors.border}

CRITICAL REQUIREMENTS:
1. **PRIORITY: If the user specified colors, fonts, styles, or any design preferences in their requirements above, USE THOSE EXACTLY instead of the defaults**
2. Output ONLY valid HTML - no markdown, no code blocks, no explanations
3. Include all CSS inline in a <style> tag in the <head>
4. Include any JavaScript in <script> tags at the end of <body>
5. Use Google Fonts (use Inter by default, or whatever font the user requested)
6. Make it responsive and mobile-friendly
7. Add subtle animations and hover effects for interactivity
8. Make forms/buttons functional with JavaScript (use alerts for submissions)
9. Include realistic placeholder content that matches the description
10. Use modern CSS features like flexbox/grid, border-radius, box-shadows
11. Make it production-quality and visually stunning

Generate the complete HTML document now:`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
            {
                role: 'system',
                content: 'You are an expert web developer. Output ONLY raw HTML code. Never use markdown code blocks. Never add explanations. Just output the HTML starting with <!DOCTYPE html>.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: 4000
    });

    let html = response.choices[0]?.message?.content || '';

    // Clean up any markdown artifacts that might have slipped through
    html = html.replace(/^```html\s*/i, '');
    html = html.replace(/^```\s*/i, '');
    html = html.replace(/\s*```$/i, '');
    html = html.trim();

    // Ensure it starts with DOCTYPE
    if (!html.toLowerCase().startsWith('<!doctype')) {
        const doctypeIndex = html.toLowerCase().indexOf('<!doctype');
        if (doctypeIndex !== -1) {
            html = html.substring(doctypeIndex);
        }
    }

    return html;
}
