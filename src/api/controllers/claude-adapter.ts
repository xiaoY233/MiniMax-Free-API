import { PassThrough } from "stream";
import _ from "lodash";
import chat from "@/api/controllers/chat-agent.ts";
import util from "@/lib/util.ts";
import logger from "@/lib/logger.ts";

const MODEL_NAME = "hailuo";

/**
 * Convert Claude messages format to MiniMax format
 * 
 * @param messages Claude messages array
 * @param system Optional system message (string or array format)
 */
export function convertClaudeToMiniMax(messages: any[], system?: string | any[]): any[] {
    const minimaxMessages: any[] = [];

    // Convert system to string if it's an array
    let systemText: string | undefined = undefined;
    if (system) {
        if (Array.isArray(system)) {
            // Extract text from array format system message
            systemText = system
                .filter((item: any) => item.type === "text")
                .map((item: any) => item.text)
                .join("\n");
        } else if (typeof system === "string") {
            systemText = system;
        }
    }

    // If there's a system message, prepend it to the first user message
    let systemPrepended = false;

    for (const msg of messages) {
        if (msg.role === "user") {
            let content = msg.content;

            // Ensure content is defined, default to empty string if undefined/null
            if (content === undefined || content === null) {
                content = "";
            }
            // Handle content array format
            else if (Array.isArray(content)) {
                content = content
                    .filter((item: any) => item.type === "text")
                    .map((item: any) => item.text)
                    .join("\n");
            }

            // Prepend system message to first user message
            if (systemText && !systemPrepended) {
                content = `${systemText}\n\n${content}`;
                systemPrepended = true;
            }

            minimaxMessages.push({
                role: "user",
                content: content
            });
        } else if (msg.role === "assistant") {
            let content = msg.content;

            // Ensure content is defined, default to empty string if undefined/null
            if (content === undefined || content === null) {
                content = "";
            }
            // Handle content array format
            else if (Array.isArray(content)) {
                content = content
                    .filter((item: any) => item.type === "text")
                    .map((item: any) => item.text)
                    .join("\n");
            }

            minimaxMessages.push({
                role: "assistant",
                content: content
            });
        }
    }

    return minimaxMessages;
}

/**
 * Convert MiniMax response to Claude format
 * 
 * @param minimaxResponse MiniMax response object
 */
export function convertMiniMaxToClaude(minimaxResponse: any): any {
    const content = minimaxResponse.choices[0].message.content;

    return {
        id: minimaxResponse.id || util.uuid(),
        type: "message",
        role: "assistant",
        content: [
            {
                type: "text",
                text: content
            }
        ],
        model: MODEL_NAME,
        stop_reason: minimaxResponse.choices[0].finish_reason === "stop" ? "end_turn" : "max_tokens",
        stop_sequence: null,
        usage: {
            input_tokens: minimaxResponse.usage?.prompt_tokens || 0,
            output_tokens: minimaxResponse.usage?.completion_tokens || 0
        }
    };
}

/**
 * Convert MiniMax stream to Claude SSE format
 * 
 * @param minimaxStream MiniMax stream
 */
export function convertMiniMaxStreamToClaude(minimaxStream: any): PassThrough {
    const transStream = new PassThrough();
    const messageId = util.uuid();
    let contentBuffer = "";
    let isFirstChunk = true;

    minimaxStream.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n");

        for (const line of lines) {
            if (!line.trim() || line.trim() === "data: [DONE]") continue;

            if (line.startsWith("data: ")) {
                try {
                    const data = JSON.parse(line.slice(6));

                    if (data.choices && data.choices[0]) {
                        const delta = data.choices[0].delta;

                        // Send message_start event on first chunk
                        if (isFirstChunk) {
                            transStream.write(`event: message_start\ndata: ${JSON.stringify({
                                type: "message_start",
                                message: {
                                    id: messageId,
                                    type: "message",
                                    role: "assistant",
                                    content: [],
                                    model: MODEL_NAME,
                                    stop_reason: null,
                                    stop_sequence: null,
                                    usage: { input_tokens: 0, output_tokens: 0 }
                                }
                            })}\n\n`);

                            transStream.write(`event: content_block_start\ndata: ${JSON.stringify({
                                type: "content_block_start",
                                index: 0,
                                content_block: { type: "text", text: "" }
                            })}\n\n`);

                            isFirstChunk = false;
                        }

                        // Handle content delta
                        if (delta.content) {
                            contentBuffer += delta.content;
                            transStream.write(`event: content_block_delta\ndata: ${JSON.stringify({
                                type: "content_block_delta",
                                index: 0,
                                delta: { type: "text_delta", text: delta.content }
                            })}\n\n`);
                        }

                        // Handle finish
                        if (data.choices[0].finish_reason) {
                            transStream.write(`event: content_block_stop\ndata: ${JSON.stringify({
                                type: "content_block_stop",
                                index: 0
                            })}\n\n`);

                            transStream.write(`event: message_delta\ndata: ${JSON.stringify({
                                type: "message_delta",
                                delta: { stop_reason: "end_turn", stop_sequence: null },
                                usage: { output_tokens: 1 }
                            })}\n\n`);

                            transStream.write(`event: message_stop\ndata: ${JSON.stringify({
                                type: "message_stop"
                            })}\n\n`);

                            transStream.end();
                        }
                    }
                } catch (err) {
                    logger.error(`Error parsing stream chunk: ${err}`);
                }
            }
        }
    });

    minimaxStream.on("error", (err: any) => {
        logger.error(`MiniMax stream error: ${err}`);
        transStream.end();
    });

    minimaxStream.on("close", () => {
        if (!transStream.closed) {
            transStream.end();
        }
    });

    return transStream;
}

/**
 * Create Claude completion using MiniMax backend
 * 
 * @param model Model name
 * @param messages Claude messages
 * @param system Optional system message
 * @param token MiniMax token
 * @param stream Whether to stream
 */
export async function createClaudeCompletion(
    model: string,
    messages: any[],
    system: string | any[] | undefined,
    token: string,
    stream: boolean = false
): Promise<any | PassThrough> {
    try {
        // Convert Claude format to MiniMax format
        const minimaxMessages = convertClaudeToMiniMax(messages, system);

        if (stream) {
            // Create streaming completion
            const minimaxStream = await chat.createAgentCompletionStream(
                model,
                minimaxMessages,
                token
            );
            
            // Convert MiniMax stream to Claude SSE format
            return convertMiniMaxStreamToClaude(minimaxStream);
        } else {
            // Create regular completion
            const minimaxResponse = await chat.createAgentCompletion(
                model,
                minimaxMessages,
                token
            );

            // Convert MiniMax response to Claude format
            return convertMiniMaxToClaude(minimaxResponse);
        }
    } catch (error) {
        logger.error(`Error creating Claude completion: ${error}`);
        throw error;
    }
}