import { Message as MessageType } from '../../types';
import { HtmlPreview } from './HtmlPreview';
import './Message.css';

interface MessageProps {
    message: MessageType;
    isStreaming?: boolean;
    streamingContent?: string;
    userEmail?: string;
}

// Extract HTML content from stored tool results
function extractHtmlFromToolResult(toolResult: string | undefined, toolName: string | undefined): { html: string; title: string } | null {
    if (!toolResult || !toolName) return null;

    try {
        // tool_result is stored as a JSON array of results (one per tool call)
        const results = JSON.parse(toolResult);

        for (const result of results) {
            if (result?.data?.previewHtml) {
                return { html: result.data.previewHtml, title: result.data.title || 'Page Preview' };
            }
            if (result?.data?.reportHtml) {
                return { html: result.data.reportHtml, title: result.data.title || 'Analysis Report' };
            }
        }
    } catch {
        // If it's not an array, try parsing as single result
        try {
            const result = JSON.parse(toolResult);
            if (result?.data?.previewHtml) {
                return { html: result.data.previewHtml, title: result.data.title || 'Page Preview' };
            }
            if (result?.data?.reportHtml) {
                return { html: result.data.reportHtml, title: result.data.title || 'Analysis Report' };
            }
        } catch {
            // Ignore parse errors
        }
    }

    return null;
}

export function Message({ message, isStreaming, streamingContent, userEmail }: MessageProps) {
    const isUser = message.role === 'user';
    const content = isStreaming ? streamingContent : message.content;
    const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

    // Check if this message has stored HTML preview
    const htmlContent = extractHtmlFromToolResult(message.tool_result, message.tool_name);

    return (
        <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
            <div className="message-avatar">
                {isUser ? (
                    <div className="avatar avatar-user">{userInitial}</div>
                ) : (
                    <div className="avatar avatar-assistant">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                )}
            </div>
            <div className="message-content">
                <div className="message-header">
                    <span className="message-role">{isUser ? 'You' : 'Blocks AI'}</span>
                </div>
                <div className="message-text">
                    {content || (isStreaming && (
                        <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    ))}
                    {isStreaming && content && <span className="cursor-blink">|</span>}
                </div>

                {/* Show stored HTML preview for messages with tool results */}
                {htmlContent && !isStreaming && (
                    <div className="message-preview">
                        <HtmlPreview html={htmlContent.html} title={htmlContent.title} />
                    </div>
                )}
            </div>
        </div>
    );
}
