# MiniMax Hailuo AI Free Service

## Project Description

<span>[ <a href="README.md">中文</a> | English ]</span>

Supports the latest MiniMax-M2 and MiniMax-M2-Stable models, with high-speed streaming output, multi-turn conversations, voice synthesis, voice recognition, internet search, long document interpretation, image analysis support, zero-configuration deployment, multi-token support, and automatic session trace cleanup.

This project is modified from [https://github.com/LLM-Red-Team/minimax-free-api](https://github.com/LLM-Red-Team/minimax-free-api), thanks for the contribution!

Modification reasons:
1. The official interface [https://hailuoai.com/](https://hailuoai.com/) in the original project has been updated, interface parameters have changed, and the API is no longer usable
2. The original project author's account was banned and can no longer be updated
> After investigation, no malicious code was found in the original project

## Update Notes

1. Updated models.ts model list to support MiniMax-M2, MiniMax-M2-Stable and other latest models
2. Migrated all API endpoints from https://hailuoai.com to https://agent.minimaxi.com, enabling client AI Q&A interaction through the proxy service

> PS: The model name actually doesn't matter much, just for convenience and aesthetics. In practice, whatever model is used for online Chat calls is the model being used. Model names can be filled in arbitrarily.

### Version Information

- v1.0.0-fix (2025-11-24)
    - Modified default homepage styling, added access methods and example code
    - Modified all API endpoints of the project, basically equivalent to refactoring the project

#### Detailed Updates
1. Updated message sending endpoint:
   From /v4/api/chat/msg to /matrix/api/v1/chat/send_msg
2. Adjusted request data format:
```
{
    "msg_type": 1,
    "text": "Message content",
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
    ...
}
```

## Supported Models

- MiniMax-M2: Designed for efficient coding and Agent workflows
- MiniMax-M2-Stable: Higher concurrency, suitable for commercial use

## Effect Examples

### Identity Verification

![Identity Verification](./doc/example-0.png)

### Multi-turn Dialogue

![Multi-turn Dialogue](./doc/example-1.png)

### AI Q&A

![AI Q&A](./doc/example-2.png)

### Code Generation

![Code Generation](./doc/example-3.png)

### Image Analysis

![Image Analysis](./doc/example-4.png)

### Long Document Reading

![Long Document Reading](./doc/example-5.png)

### Voice Chat

![Voice Chat](./doc/example-6.png)

### Network Search

![Network Search](./doc/example-7.png)

## Access Preparation

Log in to [Hailuo AI](https://hailuoai.com/) and start a random conversation, then press F12 to open developer tools. Find the value of `access_token` in Application > Local Storage, which will be used as the Bearer Token value for Authorization: `Authorization: Bearer TOKEN`

![Get access_token](./doc/example-0.png)

### Multi-Account Access

You can provide multiple account `access_token` and join them with `,`:

`Authorization: Bearer TOKEN1,TOKEN2,TOKEN3`

The service will pick one each time a request is made.

## Docker Deployment

Please prepare a server with a public IP and open port 8000.

Pull the image and start the service:

```shell
docker run -it -d --init --name minimax-free-api -p 8000:8000 -e TZ=Asia/Shanghai hrajpuroh1t/minimax-free-api-fix:latest
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
    image: hrajpuroh1t/minimax-free-api-fix:latest
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

## Disclaimer

**Reverse APIs are unstable. It is recommended to use the official MiniMax platform at https://platform.minimaxi.com/ for paid API usage to avoid the risk of being banned.**

**This project is purely for research, exchange, and learning purposes!**

**For personal use only. It is prohibited to provide services to others or for commercial use, so as not to put pressure on the official service. Otherwise, the risk is borne by yourself!**

**For personal use only. It is prohibited to provide services to others or for commercial use, so as not to put pressure on the official service. Otherwise, the risk is borne by yourself!**

**For personal use only. It is prohibited to provide services to others or for commercial use, so as not to put pressure on the official service. Otherwise, the risk is borne by yourself!**

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