# MiniMax AI Free Service

## Project Description

<span>[ <a href="README.md">中文</a> | English ]</span>

Supports the latest MiniMax-M2 and MiniMax-M2-Stable models, supports high-speed streaming output, multi-turn dialogue, speech synthesis, speech recognition, web search, long document analysis, image parsing, zero-configuration deployment, multi-token support, and automatic session cleanup.

This project is modified from [https://github.com/LLM-Red-Team/minimax-free-api](https://github.com/LLM-Red-Team/minimax-free-api), thanks to the contributor!

Modification reasons:
1. The official interface in the original project [https://hailuoai.com/](https://hailuoai.com/) has been updated, API parameters have changed, and the API is no longer available
2. The original project author's account has been blocked and cannot be updated
> After investigation, no malicious code was found in the original project

## Update Notes

1. Updated models.ts model list to support MiniMax-M2, MiniMax-M2-Stable and other latest models
2. Migrated all API endpoints of the project from `https://hailuoai.com` to `https://agent.minimaxi.com`, enabling client-side AI Q&A interaction through proxy services

> PS: The model name actually doesn't matter much, it's just for convenience and aesthetics. In actual online Chat calls, whatever model is used is the actual model used. Model names can be filled arbitrarily.

### Version Notes

- v1.0.1 (2025-12-07)
    - Fixed 401 authentication failure for newly registered accounts, switched to using realUserID and _token concatenation for authentication
    - Refactored default homepage style and content, updated to new version
    - Added Gemini and Claude adapters

- v1.0.0-fix (2025-11-24)
    - Modified default homepage style, added access methods and example code
    - Modified all API endpoints of the project, basically refactoring the project
    
#### Detailed Updates    
1. Updated message sending endpoint:
    Changed from /v4/api/chat/msg to /matrix/api/v1/chat/send_msg
2. Adjusted request data format:
```
    {
    "msg_type": 1,
    "text": "message content",
    "chat_type": 1,
    "attachments": [],
    "selected_mcp_tools": [],
    "backend_config": {}
    }
```
3. Adjusted response data parsing:
```
    {
    "chat_id": 337867554939466,
    "msg_id": 337867385770195,
    "agent_pod_ip": "172.18.131.237",
    "chat_language": 2,
    "base_resp": {
        "status_code": 0,
        "status_msg": "success"
    }
    }
```
4. Removed HTTP2 streaming requests, switched to standard HTTP/1.1 SSE or polling
5. Adjusted `messagesPrepare()` function to match the new format
  
## Disclaimer

**Reverse APIs are unstable. It is recommended to use the official MiniMax platform at https://www.minimaxi.com/platform for paid API usage to avoid the risk of being banned.**

**This organization and individuals do not accept any financial donations or transactions. This project is purely for research, exchange, and learning purposes!**

**For personal use only. It is prohibited to provide services to others or for commercial use, so as not to put pressure on the official service. Otherwise, the risk is borne by yourself!**

**For personal use only. It is prohibited to provide services to others or for commercial use, so as not to put pressure on the official service. Otherwise, the risk is borne by yourself!**

**For personal use only. It is prohibited to provide services to others or for commercial use, so as not to put pressure on the official service. Otherwise, the risk is borne by yourself!**

## Effect Examples

### Service Default Homepage

After the service starts, the default homepage includes access guide and API documentation for quick integration without switching back and forth to find documentation.

![index.html](./doc/index.png)

### Gemini-cli Access

The version adds a gemini-cli adapter, allowing direct API calls within gemini-cli.

![gemini-cli](./doc/gemini-cli.png)

### Claude-code Access

The version adds a Claude-code adapter, allowing direct API calls within Claude-code.

![claude-code](./doc/claude-code.png)

### Identity Verification

![Identity Verification](./doc/example-1.png)

### Speech Synthesis Demo

Speech synthesis creates voice

![Speech Synthesis](./doc/example-2.png)

### Speech Recognition Demo

Speech recognition creates transcriptions

![Speech Recognition](./doc/example-7.png)

### Multi-turn Dialogue

![Multi-turn Dialogue](./doc/example-3.png)

### Web Search

![Web Search](./doc/example-4.png)

### Long Document Analysis

![Long Document Analysis](./doc/example-5.png)

### Image Analysis

![Image Analysis](./doc/example-6.png)

## Access Preparation

Get token from [Minimaxi-Agent](https://agent.minimaxi.com/)

Enter Minimaxi-Agent and start any conversation, then press F12 to open developer tools. Find the value of `_token` in Application > Local Storage

![Get _token](./doc/example-0.png)

Click on user_detail_agent, find the value of realUserID, then concatenate realUserID and `_token` using the `+` symbol, for example: 450234567894+eyJhbGciOiJIUzI1NiI......

This will be used as the Bearer Token value for Authorization: `Authorization: Bearer TOKEN`

### Multi-Account Access

Currently, it seems that the same account is limited to only one output at a time. You can provide multiple account `_token` and join them with `,`:

`Authorization: Bearer TOKEN1,TOKEN2,TOKEN3`

The service will pick one each time a request is made.

## Docker Deployment

Please prepare a server with a public IP and open port 8000.

Pull the image and start the service:

```shell
docker run -it -d --init --name minimax-free-api -p 8000:8000 -e TZ=Asia/Shanghai akashrajpuroh1t/minimax-free-api-fix:latest
```

Check service real-time logs:

```shell
docker logs -f minimax-free-api
```

Restart service:

```shell
docker restart minimax-free-api
```

Stop service:

```shell
docker stop minimax-free-api
```

### Docker-compose Deployment

```yaml
version: '3'

services:
  minimax-free-api:
    container_name: minimax-free-api
    image: vinlic/minimax-free-api:latest
    restart: always
    ports:
      - "8000:8000"
    environment:
      - TZ=Asia/Shanghai
```

## Interface List

Currently supports OpenAI-compatible `/v1/chat/completions` interface. You can use OpenAI-compatible client access interfaces or other compatible clients, or use online services such as [dify](https://dify.ai/) to access and use.

### Chat Completions

Chat completions interface, compatible with OpenAI's [chat-completions-api](https://platform.openai.com/docs/guides/text-generation/chat-completions-api).

**POST /v1/chat/completions**

The header needs to set the Authorization header:

```
Authorization: Bearer [_token]
```

Request data:
```json
{
    // model name can be arbitrary
    "model": "hailuo",
    "messages": [
        {
            "role": "user",
            "content": "Who are you?"
        }
    ],
    // if using SSE streaming, set to true, default false
    "stream": false
}
```

Response data:
```json
{
    "id": "242830597915504644",
    "model": "hailuo",
    "object": "chat.completion",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "I am Hailuo AI, an AI assistant independently developed by Shanghai Xiyu Technology Co., Ltd. (MiniMax). I can help you answer various questions, provide information queries, life advice, learning guidance and other services. If you have any questions, feel free to ask me."
            },
            "finish_reason": "stop"
        }
    ],
    "usage": {
        "prompt_tokens": 1,
        "completion_tokens": 1,
        "total_tokens": 2
    },
    "created": 1714751470
}
```

## Recommended Clients

- **OpenAI Official**: [ChatGPT](https://chat.openai.com/)、[OpenAI API](https://platform.openai.com/)
- **Third-party Clients**: [Lobe Chat](https://chat-plugins.lobehub.com/)、[ChatBox](https://chatboxai.app/)、[One API](https://github.com/songquanpeng/one-api)
- **AI Platforms**: [Dify](https://dify.ai/)、[FastGPT](https://fastgpt.in/)
- **CLI Tools**: [OpenAI CLI](https://platform.openai.com/docs/guides/cli)

## Support for Other Free APIs

If you find this project helpful, you might also be interested in these free APIs:

- Qwen Free API [qwen-free-api](https://github.com/LLM-Red-Team/qwen-free-api)
- Moonshot AI (Kimi.ai) API [kimi-free-api](https://github.com/LLM-Red-Team/kimi-free-api)
- StepFun (StepChat) API [step-free-api](https://github.com/LLM-Red-Team/step-free-api)
- ZhipuAI (ChatGLM) API [glm-free-api](https://github.com/LLM-Red-Team/glm-free-api)
- Meta Sota (metaso) API [metaso-free-api](https://github.com/LLM-Red-Team/metaso-free-api)
- Iflytek Spark API [spark-free-api](https://github.com/LLM-Red-Team/spark-free-api)
- Lingxin Intelligence (Emohaa) API [emohaa-free-api](https://github.com/LLM-Red-Team/emohaa-free-api) (OUT OF ORDER)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**xiaoY233**

---

**MiniMax Hailuo AI Free Service - Empowering Your AI Applications with Zero Configuration**