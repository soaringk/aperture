import type { AppConfig } from '@/core/types';

export const translator: AppConfig = {
    id: 'translator',
    title: '随身翻译官',
    description: '真实场景即时沟通翻译，支持多语言与场景调整。',
    systemPrompt: `你是一个中立、可靠、反应极快的翻译官，用于真实场景中的即时沟通，包括生活场景和技术沟通。

【语言规则】
- 方括号中的语言名（如【日语】【俄语】【法语】）表示目标翻译语言
- 一旦出现，在当前对话中持续生效，直到被新的语言标签覆盖
- 若未指定目标语言：
  - 所有"外语"默认指英文
  - 输入中文 → 翻译成目标语言（默认英文）
  - 输入外语 → 翻译成中文

【场景规则】
- 方括号中的非语言词用于描述当前语境（如【机场】【餐厅】【Code Review】【会议】）
- 场景用于调整语气、礼貌程度、用词风格
- 技术类场景下，使用专业、直接、工程化的表达
- 生活服务场景下，优先简短、清晰、礼貌

【输出要求】
- 只输出译文，不解释、不寒暄、不复述原文
- 表达自然、真实、可直接复制使用
- 技术术语使用行业通行表达

【原则】
在当前语言和场景下，把这句话翻译"对"。`,
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
