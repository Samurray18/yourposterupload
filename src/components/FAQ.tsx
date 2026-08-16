import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useState } from "react"

const faqs = [
  {
    q: "Is this really possible? Snapchat deletes messages.",
    a: "Snapchat removes messages from its servers, but fragments often remain in your device's local app data, caches and backups. Our scan finds and rebuilds those fragments into readable conversations.",
  },
  {
    q: "Do I need my Snapchat password or account access?",
    a: "No. The entire scan works with data already stored on your own device. We never ask for, or use, your Snapchat login credentials.",
  },
  {
    q: "Are my recovered messages sent to your servers?",
    a: "Never. Everything runs locally on your device in your browser. Your chats never leave your machine, and nothing is uploaded or stored by us.",
  },
  {
    q: "Does it work on iPhone and Android?",
    a: "The recovery tool works in any modern browser on any device — phone, tablet or computer. Scan results depend on what local data is available on the device you scan.",
  },
  {
    q: "How long does a scan take?",
    a: "Most scans finish in under a minute. Larger data sets with many media files can take slightly longer, but you'll see live progress the whole way.",
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="relative mx-auto max-w-3xl scroll-mt-24 px-4 pb-24 pt-4 sm:px-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/60">
          FAQ
        </span>
        <h2 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Got <span className="text-snap">questions?</span>
        </h2>
      </motion.div>

      <div className="mt-10 space-y-3">
        {faqs.map((f, i) => {
          const isOpen = open === i
          return (
            <motion.div
              key={f.q}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={`overflow-hidden rounded-2xl border transition-colors ${
                isOpen ? "border-snap/30 bg-white/[0.04]" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-semibold text-white">{f.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-snap transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-sm leading-relaxed text-white/55">{f.a}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}