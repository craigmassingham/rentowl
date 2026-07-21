import * as React from "react";

/** Renders `**bold**` within a clause line; nothing else is inline-styled. */
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/**
 * On-screen preview of an assembled clause body — the same constrained
 * markdown subset the PDF renders (paragraphs, `1.` numbered items, bold).
 */
export function ClauseBodyPreview({ body }: { body: string }) {
  const blocks = body.split(/\n\s*\n/);
  return (
    <div className="mt-2 grid gap-2 text-sm leading-relaxed">
      {blocks.map((block, bi) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const items = lines.map((line) => /^(\d+)\.\s+(.*)$/.exec(line));
        // A block is a numbered list if every line is a numbered item.
        if (items.every(Boolean) && items.length > 0) {
          return (
            <ol key={bi} className="grid gap-1.5">
              {items.map((m, li) => (
                <li key={li} className="flex gap-2">
                  <span className="text-muted-foreground">{m![1]}.</span>
                  <span>
                    <InlineText text={m![2]!} />
                  </span>
                </li>
              ))}
            </ol>
          );
        }
        return lines.map((line, li) => (
          <p key={`${bi}-${li}`}>
            <InlineText text={line} />
          </p>
        ));
      })}
    </div>
  );
}
