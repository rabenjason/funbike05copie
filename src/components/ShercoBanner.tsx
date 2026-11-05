import { homepageContent } from "../data/homepage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { motion, useInView, type Variants } from "framer-motion";
import { useRef } from "react";

/** Parent: reveals its children one after the other when scrolled into view */
const group: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

/** Child: slides in from the left and settles into place */
const fromLeft: Variants = {
  hidden: { opacity: 0, x: -70, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 120, damping: 18, mass: 0.9 },
  },
};

export default function ShercoBanner({ go }: { go: (page: string, id?: string) => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const contentVisible = useInView(contentRef, {
    once: false,
    amount: 0.18,
    margin: "0px 0px -12% 0px",
  });

  return (
    <section className="relative isolate min-h-[330px] overflow-hidden bg-[#1a1b18] sm:min-h-[440px]">
      <motion.img
        src="https://www.sherco.com/wp-content/uploads/SHERCO50ccV2-32.jpg"
        alt={homepageContent.sherco.imageAlt}
        loading="lazy"
        initial={{ scale: 1.035 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 h-full w-full object-cover object-[58%_center]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="hero-glass-sheet max-w-[760px]" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[330px] w-full max-w-(--container-site) items-center px-4 py-12 sm:min-h-[440px] sm:px-7 lg:px-10">
        <motion.div
          ref={contentRef}
          variants={group}
          initial="hidden"
          animate={contentVisible ? "visible" : "hidden"}
          className="max-w-xl"
        >
          <motion.p variants={fromLeft} className="fluid-eyebrow font-bold uppercase text-[#ffd100]">
            {homepageContent.sherco.surTitre}
          </motion.p>

          <motion.h2 variants={fromLeft} className="fluid-h1 mt-3 font-display font-semibold text-white">
            {homepageContent.sherco.titreLigne1}
            <br />
            {homepageContent.sherco.titreLigne2}
          </motion.h2>

          <motion.p variants={fromLeft} className="fluid-body mt-3 max-w-md text-white/80">
            {homepageContent.sherco.description}
          </motion.p>

          <motion.button
            variants={fromLeft}
            onClick={() => go("motos")}
            className="fluid-btn mt-5 inline-flex items-center gap-3 border-b border-[#ffd100] pb-2 font-bold uppercase text-white transition hover:text-[#ffd100]"
          >
            {homepageContent.sherco.bouton} <FontAwesomeIcon icon={faArrowRight} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
