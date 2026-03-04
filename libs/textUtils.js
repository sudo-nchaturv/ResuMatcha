export const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','by','for','from','has','he','in','is','it','its','of','on','that','the','to','was','were','will','with','you','your','or','we','our'
]);

export function normalizeText(text = '') {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

export function tokenize(text = '') {
  return normalizeText(text)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function unique(array) {
  return [...new Set(array)];
}

export function countOccurrences(tokens) {
  return tokens.reduce((acc, token) => {
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});
}
