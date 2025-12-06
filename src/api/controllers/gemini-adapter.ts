import { PassThrough } from "stream";
import _ from "lodash";
import chat from "@/api/controllers/chat-agent.ts";
import util from "@/lib/util.ts";
import logger from "@/lib/logger.ts";

const MODEL_NAME = "hailuo";

/**
 * Convert Gemini contents format to MiniMax format
 * 
 * @param contents Gemini contents array
 * @param systemInstruction Optional system instruction
 */
export function convertGeminiToMiniMax(contents: any[], systemInstruction?: any): any[] {
    const minimaxMessages: any[] = [];

    // Handle system instruction
    let systemText = "";
    if (systemInstruction) {
        if (typeof systemInstruction === "string") {
            systemText = systemInstruction;
        } else if (systemInstruction.parts) {
            systemText = systemInstruction.parts
                .filter((part: any) => part.text)
                .map((part: any) => part.text)
                .join("\n");
        }
    }

    let systemPrepended = false;

    for (const content of contents) {
        const role = content.role === "model" ? "assistant" : "user";

        // Extract text from parts
        let text = "";
        if (content.parts && Array.isArray(content.parts)) {
            text = content.parts
                .filter((part: any) => part.text)
                .map((part: any) => part.text)
                .join("\n");
        }

        // Prepend system instruction to first user message
        if (role === "user" && systemText && !systemPrepended) {
            text = `${systemText}\n\n${text}`;
            systemPrepended = true;
        }

        minimaxMessages.push({
            role: role,
            content: text
        });
    }

    return minimaxMessages;
}

/**
 * Convert MiniMax response to Gemini format
 * 
 * @param minimaxResponse MiniMax response object
 */
export function convertMiniMaxToGemini(minimaxResponse: any): any {
    const content = minimaxResponse.choices[0].message.content;

    return {
        candidates: [
            {
                content: {
                    parts: [
                        {
                            text: content
                        }
                    ],
                    role: "model"
                },
                finishReason: minimaxResponse.choices[0].finish_reason === "stop" ? "STOP" : "MAX_TOKENS",
                index: 0,
                safetyRatings: []
            }
        ],
        usageMetadata: {
            promptTokenCount: minimaxResponse.usage?.prompt_tokens || 0,
            candidatesTokenCount: minimaxResponse.usage?.completion_tokens || 0,
            totalTokenCount: minimaxResponse.usage?.total_tokens || 0
        }
    };
}

/**
 * Convert MiniMax stream to Gemini SSE format
 * 
 * @param minimaxStream MiniMax stream
 */
export function convertMiniMaxStreamToGemini(minimaxStream: any): PassThrough {
    const transStream = new PassThrough();
    let contentBuffer = "";

    minimaxStream.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n");

        for (const line of lines) {
            if (!line.trim() || line.trim() === "data: [DONE]") continue;

            if (line.startsWith("data: ")) {
                try {
                    const data = JSON.parse(line.slice(6));

                    if (data.choices && data.choices[0]) {
                        const delta = data.choices[0].delta;

                        // Handle content delta
                        if (delta.content) {
                            contentBuffer += delta.content;
                            const geminiChunk = {
                                candidates: [
                                    {
                                        content: {
                                            parts: [
                                                {
                                                    text: delta.content
                                                }
                                            ],
                                            role: "model"
                                        },
                                        finishReason: null,
                                        index: 0,
                                        safetyRatings: []
                                    }
                                ]
                            };
                            transStream.write(`data: ${JSON.stringify(geminiChunk)}\n\n`);
                        }

                        // Handle finish
                        if (data.choices[0].finish_reason) {
                            const finalChunk = {
                                candidates: [
                                    {
                                        content: {
                                            parts: [
                                                {
                                                    text: ""
                                                }
                                            ],
                                            role: "model"
                                        },
                                        finishReason: "STOP",
                                        index: 0,
                                        safetyRatings: []
                                    }
                                ],
                                usageMetadata: {
                                    promptTokenCount: 1,
                                    candidatesTokenCount: 1,
                                    totalTokenCount: 2
                                }
                            };
                            transStream.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
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
 * Create Gemini completion using MiniMax backend
 * 
 * @param model Model name
 * @param contents Gemini contents
 * @param systemInstruction Optional system instruction
 * @param token MiniMax token
 * @param stream Whether to stream
 */
export async function createGeminiCompletion(
    model: string,
    contents: any[],
    systemInstruction: any,
    token: string,
    stream: boolean = false
): Promise<any | PassThrough> {
    try {
        // Convert Gemini format to MiniMax format
        const minimaxMessages = convertGeminiToMiniMax(contents, systemInstruction);

        if (stream) {
            // Create streaming completion
            const minimaxStream = await chat.createAgentCompletionStream(
                model,
                minimaxMessages,
                token
            );
            
            // Convert MiniMax stream to Gemini SSE format
            return convertMiniMaxStreamToGemini(minimaxStream);
        } else {
            // Create regular completion
            const minimaxResponse = await chat.createAgentCompletion(
                model,
                minimaxMessages,
                token
            );

            // Convert MiniMax response to Gemini format
            return convertMiniMaxToGemini(minimaxResponse);
        }
    } catch (error) {
        logger.error(`Error creating Gemini completion: ${error}`);
        throw error;
    }
}