import { memo } from "react";
import { highlight } from "sugar-high";

type CodeBlockProps = {
  code: string;
  language: "typescript" | "python";
};

export const CodeBlock = memo(function CodeBlock({
  code,
  language,
}: CodeBlockProps) {
  const html = highlight(code.trim(), { lang: language });

  return (
    <pre className="sh-code border-border bg-card h-full overflow-auto rounded-lg border-0 p-3 font-mono text-[0.8rem] leading-snug break-words whitespace-pre-wrap md:border">
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
});
