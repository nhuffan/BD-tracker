export function truncateText(value: string | number | null | undefined, max = 20) {
  const text = String(value ?? "");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}