import { useEffect, useRef } from "react";
import Typed from "typed.js";

type Props = {
  strings: string[];
  className?: string;
};

/**
 * Typing animation (Typed.js): cycles through the given strings
 * with a typewriter effect, then deletes and retypes.
 */
export default function TypedText({ strings, className = "" }: Props) {
  const el = useRef<HTMLSpanElement>(null);
  const typed = useRef<Typed | null>(null);

  useEffect(() => {
    if (!el.current) return;
    typed.current = new Typed(el.current, {
      strings,
      typeSpeed: 65,
      backSpeed: 38,
      backDelay: 1400,
      loop: true,
      smartBackspace: true,
    });
    return () => {
      typed.current?.destroy();
      typed.current = null;
    };
  }, [strings]);

  return (
    <span className={className}>
      <span ref={el} />
      {/* Blinking caret styled like Typed.js default */}
      <span
        aria-hidden="true"
        className="inline-block w-[3px] animate-pulse align-middle bg-[#ffd100]"
        style={{ height: "1em" }}
      />
    </span>
  );
}
