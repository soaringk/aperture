import * as pkg from '@google/genai';
const keys = Object.keys(pkg);
// console.log('Keys:', keys); // Too noisy
console.log('Has GoogleGenerativeAI:', keys.includes('GoogleGenerativeAI'));
console.log('Has GenAI:', keys.includes('GenAI'));
console.log('Has Client:', keys.includes('Client'));
console.log('Keys starting with G:', keys.filter(k => k.startsWith('G')));
console.log('Keys starting with C:', keys.filter(k => k.startsWith('C')));
try {
    console.log('Default keys:', Object.keys((pkg as any).default || {}));
} catch (e) { }
