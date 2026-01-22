import { Tool, ToolContext, ToolResult } from './index.js';
import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({
    apiKey: config.openaiApiKey
});

export const analyzeDataTool: Tool = {
    name: 'analyze_data',
    description: `Analyzes data provided by the user and generates insights, visualizations, or reports. Use this tool when the user:
- Provides data (CSV, JSON, numbers, or text) and wants insights
- Asks for trends, patterns, or summaries
- Wants a visual report or dashboard from their data
- Needs statistical analysis or comparisons
- Wants to understand what their data means

The tool uses AI to process the data and generate a customized HTML report with insights.`,
    inputSchema: {
        type: 'object',
        properties: {
            data: {
                type: 'string',
                description: 'The data to analyze (CSV format, JSON, or comma-separated values)'
            },
            analysisType: {
                type: 'string',
                enum: ['summary', 'trends', 'comparison', 'distribution', 'report'],
                description: 'Type of analysis to perform'
            },
            title: {
                type: 'string',
                description: 'Title for the analysis report'
            },
            question: {
                type: 'string',
                description: 'Specific question the user wants answered about the data (optional)'
            }
        },
        required: ['data', 'analysisType', 'title']
    },
    $run: async (input: {
        data: string;
        analysisType: string;
        title: string;
        question?: string;
    }, context: ToolContext): Promise<ToolResult> => {
        try {
            // Parse the data first to validate it
            const parsedData = parseInputData(input.data);

            if (!parsedData || parsedData.rowCount === 0) {
                return {
                    success: false,
                    error: 'Could not parse the provided data. Please provide data in CSV, JSON, or comma-separated format.'
                };
            }

            // Generate AI-powered analysis and HTML report
            const reportHtml = await generateAIReport(
                input.data,
                parsedData,
                input.analysisType,
                input.title,
                input.question
            );

            return {
                success: true,
                data: {
                    title: input.title,
                    analysisType: input.analysisType,
                    summary: `Performed ${input.analysisType} analysis on ${parsedData.rowCount} data points`,
                    reportHtml: reportHtml,
                    message: `Analysis complete! Generated a comprehensive ${input.analysisType} report.`
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
};

interface ParsedDataInfo {
    rowCount: number;
    isNumeric: boolean;
    headers?: string[];
    preview: string;
}

function parseInputData(data: string): ParsedDataInfo | null {
    // Try parsing as JSON
    try {
        const json = JSON.parse(data);
        if (Array.isArray(json)) {
            const headers = json.length > 0 ? Object.keys(json[0]) : [];
            return {
                rowCount: json.length,
                isNumeric: false,
                headers,
                preview: JSON.stringify(json.slice(0, 3), null, 2)
            };
        }
    } catch { }

    // Try parsing as CSV
    const lines = data.trim().split('\n');
    if (lines.length >= 1) {
        const firstLine = lines[0].split(/[,\t;]/);
        const isFirstRowNumeric = firstLine.every(v => !isNaN(parseFloat(v.trim())));

        if (isFirstRowNumeric) {
            const values = lines.flatMap(line =>
                line.split(/[,\t;]/).map(v => parseFloat(v.trim())).filter(n => !isNaN(n))
            );
            return {
                rowCount: values.length,
                isNumeric: true,
                preview: `Numbers: ${values.slice(0, 10).join(', ')}${values.length > 10 ? '...' : ''}`
            };
        } else {
            const headers = firstLine.map(h => h.trim());
            return {
                rowCount: lines.length - 1,
                isNumeric: false,
                headers,
                preview: lines.slice(0, 4).join('\n')
            };
        }
    }

    // Try parsing as simple numbers
    const numbers = data.split(/[\s,;]+/).map(v => parseFloat(v.trim())).filter(n => !isNaN(n));
    if (numbers.length > 0) {
        return {
            rowCount: numbers.length,
            isNumeric: true,
            preview: `Numbers: ${numbers.slice(0, 10).join(', ')}${numbers.length > 10 ? '...' : ''}`
        };
    }

    return null;
}

async function generateAIReport(
    rawData: string,
    parsedInfo: ParsedDataInfo,
    analysisType: string,
    title: string,
    question?: string
): Promise<string> {
    const prompt = `You are a data analyst creating a beautiful HTML report. Analyze the following data and generate a COMPLETE HTML document.

DATA:
${rawData}

DATA INFO:
- ${parsedInfo.rowCount} data points
- ${parsedInfo.isNumeric ? 'Numeric data' : 'Structured data'}
${parsedInfo.headers ? `- Columns: ${parsedInfo.headers.join(', ')}` : ''}

ANALYSIS TYPE: ${analysisType}
REPORT TITLE: ${title}
${question ? `SPECIFIC QUESTION TO ANSWER: ${question}` : ''}

REQUIREMENTS:
1. Output ONLY valid HTML - no markdown, no code blocks, no explanations
2. Include all CSS inline in a <style> tag
3. Use a dark theme with these Blocks brand colors:
   - Background: #1a1a2e
   - Card backgrounds: rgba(255, 255, 255, 0.05)
   - Primary accent: #69D2E7 (Blocks blue)
   - Secondary accent: #FF6B6B (Blocks coral)
   - Tertiary accent: #1ABC9C (Blocks green)
   - Gradient: linear-gradient(135deg, #FF6B6B 0%, #69D2E7 50%, #1ABC9C 100%)
   - Text: #ffffff
   - Muted text: #8c8c8c
   - Borders: rgba(255, 255, 255, 0.1)
4. Include the Inter font from Google Fonts
5. Create a visually stunning dashboard-style report with:
   - A gradient header with the title
   - Key metrics displayed in cards
   - Actual calculated statistics from the data (mean, median, min, max, trends, etc.)
   - A clear insights section with emoji bullets
   - Data visualization using CSS (bar charts, progress bars, etc.)
   ${question ? '- A dedicated section answering the specific question' : ''}
6. Actually analyze the data - calculate real statistics, identify patterns
7. Make it production-quality and professional

Generate the complete HTML document now:`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
            {
                role: 'system',
                content: 'You are an expert data analyst and web developer. Output ONLY raw HTML code. Never use markdown code blocks. Never add explanations. Calculate real statistics from the provided data. Start with <!DOCTYPE html>.'
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

    // Clean up any markdown artifacts
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
