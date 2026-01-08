import type { AppConfig } from '@/core/types';
import { translator } from './translator';
import { deepReader } from './deepReader';
import { wordingAdvisor } from './wordingAdvisor';
import { socialMedia } from './socialMedia';

// Order: 随身翻译、深度导读、措辞、社交媒体
export const APPS: AppConfig[] = [
    translator,
    deepReader,
    wordingAdvisor,
    socialMedia,
];
