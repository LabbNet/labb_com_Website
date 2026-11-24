import Link from "next/link";
import { Fragment } from "react";

// Renders an approved answer: blank lines split paragraphs, "- " lines become a list, web addresses become links.
function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s)]+[^\s).,;:!?])/g);
  return parts.map((p, i) => {
    if (!/^https?:\/\//.test(p)) return <Fragment key={i}>{p}</Fragment>;
    const internal = p.match(/^https?:\/\/(www\.)?labb\.com(\/[^\s]*)?$/);
    const path = internal?.[2] || "/";
    return internal ? <Link key={i} href={path}>{path.startsWith("/test-kits/") ? "View kit" : `labb.com${path === "/" ? "" : path}`}</Link> : <a key={i} href={p} target="_blank" rel="noopener nofollow">{p}</a>;
  });
}

export function AnswerText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n");
        const items = lines.filter((l) => /^\s*[-•*]\s+/.test(l));
        const intro = lines.filter((l) => !/^\s*[-•*]\s+/.test(l));
        if (items.length) {
          return (
            <Fragment key={i}>
              {intro.length > 0 && <p>{linkify(intro.join(" "))}</p>}
              <ul>{items.map((l, j) => <li key={j}>{linkify(l.replace(/^\s*[-•*]\s+/, ""))}</li>)}</ul>
            </Fragment>
          );
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j ? <br /> : null}{linkify(l)}</Fragment>)}</p>;
      })}
    </>
  );
}
