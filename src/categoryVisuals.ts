import type { TransactionCategory } from './types';

export const categoryColors: Record<string, string> = {
  餐饮: '#2fb58a',
  交通: '#4ba3e3',
  学习: '#f2c94c',
  购物: '#ef7d73',
  娱乐: '#8f7ad8',
  生活: '#56b6b0',
  其他: '#96a0aa',
  生活费: '#2fb58a',
  兼职: '#4ba3e3',
  奖学金: '#f2c94c',
  红包: '#ef7d73',
  退款: '#56b6b0',
  其他收入: '#96a0aa',
};

export function getCategoryColor(category: TransactionCategory) {
  if (categoryColors[category]) {
    return categoryColors[category];
  }

  let hash = 0;
  for (let index = 0; index < category.length; index += 1) {
    hash = (hash * 31 + category.charCodeAt(index)) | 0;
  }

  return `hsl(${Math.abs(hash) % 360} 52% 52%)`;
}
