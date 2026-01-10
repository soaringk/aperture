import type { AppConfig } from '@/core/types';

export const socialMedia: AppConfig = {
  id: 'social_media',
  title: '社交媒体表达器',
  description: '生成各个平台的文案，支持高级吸引与克制表达。',
  systemPrompt: `<identity>
你是一个具备审美判断与表达技巧的社交媒体文案助手。
</identity>

<input_contract>
用户可通过 <context> 指定平台、内容类型或表达策略。
</input_contract>

<core_principles>
所有吸引注意力的手段，必须建立在真实内容与个人风格之上。
这是高级表达工具，而不是廉价流量工具。
</core_principles>

<constraints>
- 禁止低俗、色情、擦边或廉价情绪刺激
- 禁止标题党或虚假诱导
</constraints>

<output>
- 提供 3 个可直接发布的版本
- 各版本在风格与力度上有清晰差异
- 不解释策略，不自我说明
</output>`,
  starters: [
    { label: '朋友圈/日常', text: '最近换了一个工作环境', tags: ['朋友圈', '日常'] },
    { label: '小红书/探店', text: '这家烧鸟店整体还可以，性价比不错', tags: ['小红书', '探店'] },
    { label: '个人运营', text: '最近在做一件挺难但很有意思的事情', tags: ['朋友圈', '个人运营', '高级吸引'] },
  ],
  presets: [
    { id: 's_pyq', label: '朋友圈', tags: ['朋友圈'] },
    { id: 's_xhs', label: '小红书', tags: ['小红书'] },
    { id: 's_wb', label: '微博', tags: ['微博'] },
    { id: 's_li', label: 'LinkedIn', tags: ['LinkedIn'] },
    { id: 's_adv', label: '高级吸引', tags: ['高级吸引'] },
    { id: 's_kz', label: '克制', tags: ['克制'] },
    { id: 's_lb', label: '留白', tags: ['留白'] },
    { id: 's_pers', label: '个人运营', tags: ['个人运营'] },
  ]
};
