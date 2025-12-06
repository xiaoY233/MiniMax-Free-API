import { PassThrough } from "stream";
import _ from "lodash";

import core from "./core.ts";
import logger from "@/lib/logger.ts";
import util from "@/lib/util.ts";

// 模型名称
const MODEL_NAME = "hailuo";
// 最大轮询次数
const MAX_POLL_COUNT = 60;
// 轮询间隔(毫秒)
const POLL_INTERVAL = 1000;

/**
 * Agent API 同步对话补全
 * 
 * 使用轮询机制：
 * 1. 调用 send_msg 发送消息
 * 2. 轮询 get_chat_detail 直到获取到 AI 回复
 */
async function createAgentCompletion(
    model = MODEL_NAME,
    messages: any[],
    token: string
) {
    logger.info(messages);

    // 提取引用文件URL并上传获得引用的文件ID列表
    const refFileUrls = extractRefFileUrls(messages);
    const refs = refFileUrls.length
        ? await Promise.all(
            refFileUrls.map((fileUrl) => core.uploadFile(fileUrl, token))
        )
        : [];

    // 解析新的token格式：realUserID+token
    const { realUserID, jwtToken, deviceInfo } = parseToken(token);

    // 步骤 1: 发送消息
    const sendResult = await core.request(
        "POST",
        "/matrix/api/v1/chat/send_msg",
        messagesPrepare(messages, refs),
        jwtToken, // 使用解析后的JWT token
        deviceInfo
    );

    // 调试：打印响应结构
    logger.info(`Send result structure: ${JSON.stringify(Object.keys(sendResult || {}))}`);
    logger.info(`Send result.status: ${sendResult?.status}`);
    logger.info(`Send result.statusText: ${sendResult?.statusText}`);
    logger.info(`Send result.data: ${sendResult?.data ? 'exists' : 'undefined'}`);
    if (sendResult?.data) {
        logger.info(`Data keys: ${JSON.stringify(Object.keys(sendResult.data))}`);
        try {
            logger.info(`Full data: ${JSON.stringify(sendResult.data)}`);
        } catch (jsonErr) {
            logger.info(`Full data: [Circular structure, cannot stringify]`);
        }
    } else {
        logger.info(`Response without data: status=${sendResult?.status}, statusText=${sendResult?.statusText}`);
    }

    // 检查HTTP状态码
    if (sendResult?.status !== 200) {
        logger.error(`HTTP request failed - status: ${sendResult?.status}, statusText: ${sendResult?.statusText}`);
        throw new Error(`HTTP request failed: ${sendResult?.statusText || sendResult?.status || 'Unknown error'}`);
    }

    // core.request 返回 Axios 响应，需要访问 .data 获取实际数据
    // Agent API 使用 base_resp 而非 statusInfo
    const { chat_id, msg_id, base_resp } = sendResult.data;

    if (base_resp?.status_code !== 0) {
        logger.error(`Send message failed - status_code: ${base_resp?.status_code}, status_msg: ${base_resp?.status_msg}`);
        throw new Error(`Send message failed: ${base_resp?.status_msg || 'Unknown error'}`);
    }

    logger.info(`Message sent, chat_id: ${chat_id}, msg_id: ${msg_id}`);

    // 步骤 2: 轮询获取 AI 回复
    let pollCount = 0;
    let aiMessage = null;

    while (pollCount < MAX_POLL_COUNT) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        pollCount++;

        const detailResult = await core.request(
            "POST",
            "/matrix/api/v1/chat/get_chat_detail",
            { chat_id },
            jwtToken, // 使用解析后的JWT token
            deviceInfo
        );

        const { messages: chatMessages, base_resp: detailResp } = detailResult.data;

        if (detailResp?.status_code !== 0) {
            logger.warn(`Get chat detail failed: ${detailResp?.status_msg}`);
            continue;
        }

        // 检查是否有 AI 回复（msg_type === 2）
        aiMessage = chatMessages?.find((msg: any) => msg.msg_type === 2);

        if (aiMessage) {
            logger.success(`AI response received after ${pollCount} polls`);
            break;
        }
    }

    if (!aiMessage) {
        throw new Error(`No AI response after ${MAX_POLL_COUNT} polls`);
    }

    // 构造 OpenAI 兼容的响应格式
    return {
        id: chat_id.toString(),
        model,
        object: "chat.completion",
        choices: [
            {
                index: 0,
                message: {
                    role: "assistant",
                    content: aiMessage.msg_content || "",
                },
                finish_reason: "stop",
            },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        created: util.unixTimestamp(),
    };
}

/**
 * Agent API 流式对话补全
 * 
 * 使用轮询机制模拟流式输出
 */
async function createAgentCompletionStream(
    model = MODEL_NAME,
    messages: any[],
    token: string
) {
    logger.info(messages);

    const refFileUrls = extractRefFileUrls(messages);
    const refs = refFileUrls.length
        ? await Promise.all(
            refFileUrls.map((fileUrl) => core.uploadFile(fileUrl, token))
        )
        : [];

    // 解析新的token格式：realUserID+token
    const { realUserID, jwtToken, deviceInfo } = parseToken(token);

    // 创建转换流
    const transStream = new PassThrough();
    const created = util.unixTimestamp();

    // 发送初始 chunk
    transStream.write(
        `data: ${JSON.stringify({
            id: "",
            model,
            object: "chat.completion.chunk",
            choices: [
                {
                    index: 0,
                    delta: { role: "assistant", content: "" },
                    finish_reason: null,
                },
            ],
            created,
        })}\n\n`
    );

    // 异步处理
    (async () => {
        try {
            // 步骤 1: 发送消息
            const sendResult = await core.request(
                "POST",
                "/matrix/api/v1/chat/send_msg",
                messagesPrepare(messages, refs),
                jwtToken, // 使用解析后的JWT token
                deviceInfo
            );

            // 调试：打印响应结构
            logger.info(`Stream send result structure: ${JSON.stringify(Object.keys(sendResult || {}))}`);
            logger.info(`Stream send result.status: ${sendResult?.status}`);
            logger.info(`Stream send result.statusText: ${sendResult?.statusText}`);
            logger.info(`Stream send result.data: ${sendResult?.data ? 'exists' : 'undefined'}`);
            if (sendResult?.data) {
                logger.info(`Stream data keys: ${JSON.stringify(Object.keys(sendResult.data))}`);
                try {
                    logger.info(`Stream full data: ${JSON.stringify(sendResult.data)}`);
                } catch (jsonErr) {
                    logger.info(`Stream full data: [Circular structure, cannot stringify]`);
                }
            } else {
                logger.info(`Stream response: status=${sendResult?.status}, statusText=${sendResult?.statusText}`);
            }

            // 检查HTTP状态码
            if (sendResult?.status !== 200) {
                logger.error(`Stream HTTP request failed - status: ${sendResult?.status}, statusText: ${sendResult?.statusText}`);
                throw new Error(`HTTP request failed: ${sendResult?.statusText || sendResult?.status || 'Unknown error'}`);
            }

            const { chat_id, msg_id, base_resp } = sendResult.data;

            if (base_resp?.status_code !== 0) {
                throw new Error(`Send message failed: ${base_resp?.status_msg || 'Unknown error'}`);
            }

            logger.info(`Message sent, chat_id: ${chat_id}, msg_id: ${msg_id}`);

            // 步骤 2: 轮询获取 AI 回复
            let pollCount = 0;
            let lastContent = "";

            while (pollCount < MAX_POLL_COUNT) {
                await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
                pollCount++;

                const detailResult = await core.request(
                    "POST",
                    "/matrix/api/v1/chat/get_chat_detail",
                    { chat_id },
                    jwtToken, // 使用解析后的JWT token
                    deviceInfo
                );

                const { messages: chatMessages, base_resp: detailResp } = detailResult.data;

                if (detailResp?.status_code !== 0) {
                    continue;
                }

                const aiMessage = chatMessages?.find((msg: any) => msg.msg_type === 2);

                if (aiMessage && aiMessage.msg_content) {
                    const currentContent = aiMessage.msg_content;

                    // 发送新增的内容
                    if (currentContent.length > lastContent.length) {
                        const newChunk = currentContent.substring(lastContent.length);
                        transStream.write(
                            `data: ${JSON.stringify({
                                id: chat_id.toString(),
                                model,
                                object: "chat.completion.chunk",
                                choices: [
                                    {
                                        index: 0,
                                        delta: { content: newChunk },
                                        finish_reason: null,
                                    },
                                ],
                                created,
                            })}\n\n`
                        );
                        lastContent = currentContent;
                    }

                    // 检查是否完成（这里简化处理，实际可能需要检查其他字段）
                    // 如果内容不再增长，认为完成
                    if (pollCount > 3 && currentContent === lastContent) {
                        logger.success(`AI response completed after ${pollCount} polls`);

                        // 发送结束 chunk
                        transStream.write(
                            `data: ${JSON.stringify({
                                id: chat_id.toString(),
                                model,
                                object: "chat.completion.chunk",
                                choices: [
                                    {
                                        index: 0,
                                        delta: { content: "" },
                                        finish_reason: "stop",
                                    },
                                ],
                                created,
                            })}\n\n`
                        );
                        transStream.end("data: [DONE]\n\n");
                        return;
                    }
                }
            }

            // 超时
            transStream.end("data: [DONE]\n\n");
        } catch (err) {
            logger.error(err);
            transStream.write(
                `data: ${JSON.stringify({
                    id: "",
                    model,
                    object: "chat.completion.chunk",
                    choices: [
                        {
                            index: 0,
                            delta: { content: `Error: ${err.message}` },
                            finish_reason: "stop",
                        },
                    ],
                    created,
                })}\n\n`
            );
            transStream.end("data: [DONE]\n\n");
        }
    })();

    return transStream;
}

/**
 * 解析token格式：支持realUserID+JWTtoken和直接JWTtoken两种格式
 * @param token 输入的token
 * @returns {realUserID, jwtToken, deviceInfo}
 */
function parseToken(token: string) {
    let realUserID, jwtToken;
    
    // 检查是否是 realUserID+JWTtoken 格式
    const plusIndex = token.indexOf('+');
    if (plusIndex !== -1) {
        // realUserID+JWTtoken 格式
        realUserID = token.substring(0, plusIndex);
        jwtToken = token.substring(plusIndex + 1);
        
        if (!realUserID || !jwtToken) {
            throw new Error('Token格式错误：realUserID和token都不能为空');
        }
    } else {
        // 直接的JWT token格式，使用从JWT中解析的realUserID
        jwtToken = token;
        
        // 从JWT中提取realUserID和deviceID
        const jwtParts = jwtToken.split('.');
        if (jwtParts.length !== 3) {
            throw new Error('Token格式错误：JWT token格式不正确');
        }
        
        try {
            const tokenPayload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString());
            realUserID = tokenPayload.user?.id;
            
            if (!realUserID) {
                throw new Error('Token中缺少用户ID');
            }
            
            logger.info(`从JWT token解析结果 - realUserID: ${realUserID}`);
        } catch (e) {
            throw new Error(`Token解析失败：${e.message}`);
        }
    }
    
    // 验证JWT token格式
    const jwtParts = jwtToken.split('.');
    if (jwtParts.length !== 3) {
        throw new Error('Token格式错误：JWT token格式不正确');
    }
    
    // 从JWT中提取用户信息和deviceID
    let jwtUserId, deviceId;
    try {
        const tokenPayload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString());
        jwtUserId = tokenPayload.user?.id;
        deviceId = tokenPayload.user?.deviceID;
        
        logger.info(`JWT解析结果 - UserID: ${jwtUserId}, DeviceID: ${deviceId}`);
        
        // 优先使用JWT中解析的用户ID，如果认证失败再使用已知的有效ID
        // 这里保留原始JWT中的用户ID，让MiniMax API决定是否有效
        logger.info(`使用JWT中的用户ID: ${jwtUserId}`);
    } catch (e) {
        // 如果JWT解析失败，使用已知的有效用户ID
        jwtUserId = '450394515982692354';
        deviceId = Math.floor(Math.random() * 100000000);
        logger.error(`JWT解析失败，使用有效认证ID - UserID: ${jwtUserId}, DeviceID: ${deviceId}`);
    }
    
    return {
        realUserID: realUserID, // 使用解析出的realUserID
        jwtToken,
        deviceInfo: {
            userId: jwtUserId, // 使用JWT中解析的用户ID
            realUserID: realUserID, // 保持原始realUserID
            deviceId: deviceId || Math.floor(Math.random() * 100000000),
            refreshTime: util.unixTimestamp() + 10800
        }
    };
}

/**
 * 提取消息中引用的文件URL
 */
function extractRefFileUrls(messages: any[]) {
    const urls = [];
    if (!messages.length) return urls;

    const lastMessage = messages[messages.length - 1];
    if (_.isArray(lastMessage.content)) {
        lastMessage.content.forEach((v) => {
            if (!_.isObject(v) || !["file", "image_url"].includes(v["type"])) return;
            if (
                v["type"] == "file" &&
                _.isObject(v["file_url"]) &&
                _.isString(v["file_url"]["url"])
            )
                urls.push(v["file_url"]["url"]);
            else if (
                v["type"] == "image_url" &&
                _.isObject(v["image_url"]) &&
                _.isString(v["image_url"]["url"])
            )
                urls.push(v["image_url"]["url"]);
        });
    }
    logger.info("本次请求上传：" + urls.length + "个文件");
    return urls;
}

/**
 * 消息预处理 - Agent API 格式
 */
function messagesPrepare(messages: any[], refs: any[] = []) {
    let content;

    if (messages.length < 2) {
        content = messages.reduce((content, message) => {
            if (_.isArray(message.content)) {
                return message.content.reduce((_content, v) => {
                    if (!_.isObject(v) || v["type"] != "text") return _content;
                    return _content + (v["text"] || "") + "\n";
                }, content);
            }
            return content + `${message.content}\n`;
        }, "");
        logger.info("\n透传内容:\n" + content);
    } else {
        content = (
            messages.reduce((content, message) => {
                if (_.isArray(message.content)) {
                    return message.content.reduce((_content, v) => {
                        if (!_.isObject(v) || v["type"] != "text") return _content;
                        return _content + `${message.role}:${v["text"] || ""}` + "\n";
                    }, content);
                }
                return (content += `${message.role}:${message.content}\n`);
            }, "") + "assistant:\n"
        )
            .trim()
            .replace(/\!\[.+\]\(.+\)/g, "");
        logger.info("\n对话合并:\n" + content);
    }

    return {
        msg_type: 1,
        text: content,
        chat_type: 1,
        attachments: refs.length > 0 ? refs.map(item => ({
            file_type: item.fileType,
            file_id: item.fileId,
            file_name: item.filename,
        })) : [],
        selected_mcp_tools: [],
        backend_config: {},
        sub_agent_ids: [], // 添加sub_agent_ids字段
    };
}

export default {
    createAgentCompletion,
    createAgentCompletionStream,
};
