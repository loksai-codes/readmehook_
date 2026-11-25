/** GitHub linguist colours for the language dot (card shell + OG image). Pure. */
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Shell: '#89e051',
  Zig: '#ec915c',
  Elixir: '#6e4a7e',
  Dart: '#00B4AB',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Lua: '#000080',
  HTML: '#e34c26',
  CSS: '#563d7c',
};

export function languageColor(language: string | null | undefined): string {
  return (language && LANGUAGE_COLORS[language]) || '#a1a1aa';
}
