export interface PresetContext {
    id: string;
    label: string; // Display name
    tags: string[]; // Associated tags (now direct Chinese)
    description?: string; // Optional tooltip/subtitle
}

export const PRESET_CONTEXTS: PresetContext[] = [
    // Scenes
    { id: 'scene_daily', label: '日常闲聊', tags: ['日常闲聊'] },
    { id: 'scene_work', label: '工作沟通', tags: ['工作沟通'] },
    { id: 'scene_tech', label: '技术探讨', tags: ['技术探讨'] },
    { id: 'scene_email', label: '邮件起草', tags: ['邮件'] },
    { id: 'scene_trans', label: '翻译', tags: ['翻译'] },

    // Long Example
    {
        id: 'scene_complex',
        label: '资深产品经理 (PRD评审)',
        tags: ['产品经理', 'PRD', '评审', '商业价值'],
        description: '以资深PM视角，批判性地审查需求文档，关注用户价值与商业闭环。'
    }
];
