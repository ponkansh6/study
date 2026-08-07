// oxfmt が変更したファイルは lint-staged が自動で再ステージするため、
// 整形差分が後追いコミットに漏れない。
export default {
  "*.{ts,tsx}": ["oxfmt --write", "vitest related --passWithNoTests"],
  "*.{js,jsx,mjs,cjs,mts,cts,json,md}": ["oxfmt --write"],
};
