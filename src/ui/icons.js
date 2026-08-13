export function initials(label) {
  const words = label.replace(/[^a-zA-Z0-9. ]/g, '').split(/[\s.]+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
