import sanitizeHtml from "sanitize-html";

const markdownOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3", "pre", "code"]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    code: ["class"],
    img: ["src", "alt", "title"],
    a: ["href", "name", "target", "rel"],
  },
  allowedSchemesByTag: {
    img: ["data", "http", "https"],
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
};

const SPOILER_SIGNALS = [/spoiler/i, /solution/i, /answer/i];

export function sanitizeUserMarkdown(input: string) {
  return sanitizeHtml(input, markdownOptions);
}

export function containsSpoiler(input: string) {
  const normalized = input.toLowerCase();
  return SPOILER_SIGNALS.some((regex) => regex.test(normalized));
}

export function sanitizePlainInput(value: string, maxLength = 500) {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim().slice(0, maxLength);
}
