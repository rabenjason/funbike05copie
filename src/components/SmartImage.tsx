import { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";

type Props = {
  src: string;
  alt: string;
  /** Classes of the wrapper (size, aspect ratio, background…) */
  className?: string;
  /** Classes of the <img> itself (object-fit, hover zoom…) */
  imgClassName?: string;
  eager?: boolean;
};

function Inner({ src, alt, className = "", imgClassName = "", eager = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={"relative overflow-hidden " + className}>
      {!loaded && <div className="skeleton absolute inset-0" aria-hidden="true" />}
      {failed ? (
        <div className="absolute inset-0 grid place-items-center text-black/25 dark:text-white/25" aria-label={alt}>
          <FontAwesomeIcon icon={faImage} />
        </div>
      ) : (
        <motion.img
          ref={(el: HTMLImageElement | null) => {
            if (el && !loaded && el.complete && el.naturalWidth > 0) setLoaded(true);
          }}
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(true);
          }}
          initial={false}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={"h-full w-full " + imgClassName}
        />
      )}
    </div>
  );
}

/** Image with a shimmer skeleton while loading, a soft fade-in and an error fallback. */
export default function SmartImage(props: Props) {
  return <Inner key={props.src} {...props} />;
}
