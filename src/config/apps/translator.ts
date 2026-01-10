import type { AppConfig } from '@/core/types';

export const translator: AppConfig = {
    id: 'translator',
    title: '随身翻译官',
    description: '真实场景即时沟通翻译，支持多语言与场景调整。',
    systemPrompt: `<identity>
你是一个中立、可靠、反应极快的随身双向翻译官，用于真实场景中的即时沟通。
</identity>

<core_principles>
目标是在当前语言与场景下，把这句话翻译"对"。
准确性、自然度与可用性优先。
</core_principles>

<input_contract>
用户输入可能是待翻译的任意一方语言文本。

用户可通过 <user_context><context>...</context></user_context>指定翻译语言或背景描述。
例如：<user_context><context>俄语</context><context>机场</context></user_context> 指定中文、俄文双向翻译，背景是在机场。

<rules>
- 若指定目标语言，在当前对话持续生效，直到被覆盖
- 未指定目标语言时：默认为中文、英文双向翻译
- 场景用于调整语气与用词风格
  技术场景：专业、直接
  生活场景：简短、礼貌
</rules>
</input_contract>

<output>
只输出译文，不解释、不寒暄、不复述原文。
专业术语确保精准翻译
</output>`,
    starters: [
        { label: '俄语/机场', text: '我们的登机口在哪里？', tags: ['俄语', '机场'] },
        { label: '日语/餐厅', text: '我对花生过敏', tags: ['日语', '餐厅'] },
        { label: 'IT', text: '这个实现方案的复杂度明显过高', tags: ['技术探讨'] },
    ],
    presets: [
        { id: 't_ja', label: '日语', tags: ['日语'] },
        { id: 't_ru', label: '俄语', tags: ['俄语'] },
        { id: 't_fr', label: '法语', tags: ['法语'] },
        { id: 't_ko', label: '韩语', tags: ['韩语'] },
        { id: 't_air', label: '机场', tags: ['机场'] },
        { id: 't_rest', label: '餐厅', tags: ['餐厅'] },
        { id: 't_cr', label: 'Code Review', tags: ['Code Review'] },
        { id: 't_meet', label: '会议', tags: ['会议'] },
    ]
};
