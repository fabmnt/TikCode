import { Marked, type Renderer } from "marked";
import { memo } from "react";
import { highlight, type LanguageName } from "sugar-high";
import { lang } from "sugar-high/lang";
import { cn } from "@/lib/utils";

const FALLBACK_LANGUAGE: LanguageName = "plaintext";

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const DECODED_ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&amp;": "&",
};

// Raw HTML is dropped and only these link targets survive, so the generated
// markup never carries anything the description author did not type as text.
const SAFE_HREF = /^(https?:\/\/|mailto:|\/)\S*$/i;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}

function decodeHtml(value: string) {
  return value.replace(
    /&(?:lt|gt|quot|#39|amp);/g,
    (entity) => DECODED_ENTITIES[entity],
  );
}

function resolveLanguage(tag: string | undefined) {
  return lang((tag ?? "").trim()) ?? FALLBACK_LANGUAGE;
}

function codeBlockHtml(source: string, language: LanguageName) {
  const html = highlight(source.trimEnd(), { lang: language });

  return `<pre class="sh-code">\n<code>${html}</code>\n</pre>`;
}

// Fenced code blocks are highlighted with the language of their own fence tag;
// untagged fences fall back to plain text.
const parser = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    code({ text, lang, escaped }) {
      return codeBlockHtml(
        escaped ? decodeHtml(text) : text,
        resolveLanguage(lang),
      );
    },
    html() {
      return "";
    },
    image({ text }) {
      return escapeHtml(text);
    },
    link(this: Renderer, { href, tokens }) {
      const label = this.parser.parseInline(tokens);
      const target = href.trim();

      if (!SAFE_HREF.test(target)) {
        return label;
      }

      return `<a href="${escapeHtml(target)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    },
  },
});

type RichTextProps = {
  content: string;
  className?: string;
};

export const RichText = memo(function RichText({
  content,
  className,
}: RichTextProps) {
  const html = parser.parse(content, { async: false });

  return (
    <div
      className={cn("rich-text", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
