import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faClock, faEnvelope, faLocationDot, faPhone } from "@fortawesome/free-solid-svg-icons";
import { findProductById } from "../data";
import { CONTACT_EMAIL, CONTACT_INFO } from "../data/contact";

// Les coordonnées affichées sont centralisées dans src/data/contact.ts.
const CONTACT_ICONS = { address: faLocationDot, hours: faClock, phone: faPhone, email: faEnvelope } as const;

export default function Contact({ inquiryId }: { inquiryId?: string }) {
  const [sent, setSent] = useState(false);
  const accessory = findProductById(inquiryId);
  const inquirySubject = accessory?.brandId === "tvs"
    ? "tvs-accessoires"
    : accessory?.categoryId === "pieces-detachees"
      ? "pieces"
      : "";

  return (
    <div className="bg-white dark:bg-[#141513]">

      <div className="mx-auto grid w-full max-w-(--container-site) gap-8 px-4 py-10 sm:gap-10 sm:px-7 sm:py-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-10 lg:py-14">
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="fluid-eyebrow font-bold uppercase text-[#98741b] dark:text-[#ffd100]">Funbike / Madagascar</p>
          <h2 className="fluid-h2 mt-3 max-w-sm font-display font-semibold text-[#171816] dark:text-[#f2f0ea]">
            Le meilleur conseil commence par une conversation.
          </h2>
          <div className="mt-8 border-t border-black/15 dark:border-white/15">
            {CONTACT_INFO.map((item) => (
              <div key={item.label} className="grid grid-cols-[1.5rem_1fr] gap-3 border-b border-black/15 py-4 dark:border-white/15">
                <FontAwesomeIcon icon={CONTACT_ICONS[item.id]} className="mt-1 text-xs text-[#98741b] dark:text-[#ffd100]" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/45 dark:text-white/45">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="mt-1 inline-block text-sm font-medium text-[#171816] hover:text-[#98741b] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]">
                      {item.value}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-[#171816] dark:text-[#f2f0ea]">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-5 text-black/50 dark:text-white/50">
            Besoin d'une réponse rapide ? Ouvrez la bulle de discussion en bas à droite pour parler avec Piston.
          </p>
        </motion.aside>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            const subject = (form.elements.namedItem("subject") as HTMLSelectElement).selectedOptions[0]?.textContent ?? "Demande Funbike";
            const body = [
              "Bonjour Funbike,",
              "",
              String(values.get("message") ?? ""),
              "",
              `Nom : ${String(values.get("name") ?? "")}`,
              `Téléphone : ${String(values.get("phone") ?? "")}`,
              `Email : ${String(values.get("email") ?? "")}`,
              String(values.get("whatsapp") ?? "") ? `WhatsApp : ${String(values.get("whatsapp"))}` : "WhatsApp : non renseigné",
            ].join("\n");
            window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            setSent(true);
          }}
          className="glass-panel border-t border-black/20 p-5 dark:border-white/20 sm:p-8"
        >
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="fluid-eyebrow font-bold uppercase text-[#98741b] dark:text-[#ffd100]">Demande de contact</p>
              <h2 className="fluid-h3 mt-2 font-display font-semibold text-[#171816] dark:text-[#f2f0ea]">Parlez-nous de votre projet.</h2>
            </div>
            <span className="hidden font-display text-xs text-black/35 sm:block dark:text-white/35">01 / 06</span>
          </div>

          <div className="grid gap-x-6 sm:grid-cols-2">
            {["Nom complet", "Téléphone"].map((label) => (
              <label key={label} className="mb-5 block">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">{label}</span>
                <input required name={label === "Téléphone" ? "phone" : "name"} className="mt-1.5 w-full border-b border-black/20 bg-transparent py-2 text-sm text-[#171816] outline-none transition placeholder:text-black/30 focus:border-[#98741b] dark:border-white/20 dark:text-[#f2f0ea] dark:placeholder:text-white/30 dark:focus:border-[#ffd100]" />
              </label>
            ))}
          </div>
          <label className="mb-5 block">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">Email</span>
            <input type="email" required name="email" className="mt-1.5 w-full border-b border-black/20 bg-transparent py-2 text-sm text-[#171816] outline-none transition focus:border-[#98741b] dark:border-white/20 dark:text-[#f2f0ea] dark:focus:border-[#ffd100]" />
          </label>

          <label className="mb-1.5 block">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">
              WhatsApp <span className="font-semibold normal-case tracking-normal text-black/35 dark:text-white/35">(optionnel)</span>
            </span>
            <input
              type="tel"
              inputMode="tel"
              name="whatsapp"
              placeholder="+261 3X XX XXX XX"
              className="mt-1.5 w-full border-b border-black/20 bg-transparent py-2 text-sm text-[#171816] outline-none transition placeholder:text-black/30 focus:border-[#98741b] dark:border-white/20 dark:text-[#f2f0ea] dark:placeholder:text-white/30 dark:focus:border-[#ffd100]"
            />
          </label>
          <p className="mb-5 text-[11px] leading-5 text-black/45 dark:text-white/45">
            Nous vous contactons par WhatsApp uniquement pour vous informer de la disponibilité d'une pièce
            ou de l'avancée de votre demande. Aucun message publicitaire.
          </p>

          <label className="mb-5 block">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">Sujet</span>
            <select
              required
              name="subject"
              defaultValue={inquirySubject}
              className="contact-subject mt-1.5 min-h-11 w-full cursor-pointer border-x-0 border-b border-t-0 border-black/20 bg-transparent py-2 text-sm text-[#171816] outline-none transition focus:border-[#98741b] focus:outline-none focus:ring-0 dark:border-white/20 dark:text-[#f2f0ea] dark:focus:border-[#ffd100]"
            >
              <option value="" disabled className="text-black/50">Choisissez un sujet</option>
              <option value="tvs">Informations TVS</option>
              <option value="tvs-accessoires">Équipements TVS (casques, blousons, gants)</option>
              <option value="tuktuk-tvs">Informations TukTuk TVS</option>
              <option value="fantic">Informations Fantic</option>
              <option value="sherco">Informations Sherco</option>
              <option value="pieces">Pièces détachées</option>
              <option value="autres">Autres</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">Votre message</span>
            <textarea
              required
              name="message"
              rows={4}
              defaultValue={accessory
                ? `Bonjour, je souhaiterais connaître le prix, la disponibilité et la compatibilité de : ${accessory.name}.`
                : ""}
              className="mt-1.5 w-full resize-y border-b border-black/20 bg-transparent py-2 text-sm text-[#171816] outline-none transition focus:border-[#98741b] dark:border-white/20 dark:text-[#f2f0ea] dark:focus:border-[#ffd100]"
            />
          </label>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button className="inline-flex items-center gap-3 bg-[#ffd100] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#171816] transition hover:bg-[#ffe36b]">
              Envoyer la demande <FontAwesomeIcon icon={faArrowRight} />
            </button>
            <AnimatePresence>
              {sent && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-400"
                >
                  Votre messagerie va s'ouvrir. Vérifiez puis envoyez l'e-mail pour nous contacter.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-black/40 dark:text-white/40">
            Aucun message n'est envoyé par le site : l'envoi se finalise depuis votre messagerie.
          </p>
        </motion.form>
      </div>
    </div>
  );
}