import _ from 'lodash';

// 支持的模型列表，基于官方API返回的模型
const SUPPORTED_MODELS = [
    {
        "id": "MiniMax-M2",
        "name": "MiniMax-M2",
        "object": "model",
        "owned_by": "minimax",
        "description": "专为高效编码与Agent工作流而生"
    },
    {
        "id": "MiniMax-M2-Stable",
        "name": "MiniMax-M2-Stable",
        "object": "model",
        "owned_by": "minimax",
        "description": "更高并发，商业使用，假的哦"
    }
];

export default {

    prefix: '/v1',

    get: {
        '/models': async () => {
            return {
                "data": SUPPORTED_MODELS
            };
        }

    }
}

// 导出模型验证函数
export function isValidModel(modelId: string): boolean {
    return SUPPORTED_MODELS.some(model => model.id === modelId);
}

// 导出默认模型
export const DEFAULT_MODEL = "MiniMax-M2";