import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useState } from "react"

const faqs = [
  {
    q: "How does Snapchat+ gifting work?",
    a: "Enter your friend's Snapchat username, pick a plan (1, 3, 6 or 12 months) and add an optional gift message. We process the payment securely and deliver the Snapchat+ entitlement directly to their account — they get notified on Snapchat and can activate in one tap.",
  },
  {
    q: "Does my friend need to accept the gift?",
    a: "Yes — they get a notification that you gifted them Snapchat+. One tap to claim and the subscription is active. If they already have Plus, the gifted time is added on top — nothing is wasted.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major cards, Apple Pay and Google Pay. All payments are encrypted with Stripe-level security. We never ask for your Snapchat password.",
  },
  {
    q: "Can I schedule a gift or get a refund?",
    a: "You can send instantly or schedule for a future date (perfect for birthdays). Gifts are refundable if unclaimed within 14 days. Once claimed, the time is added to their Snapchat+ and can't be reversed.",
  },
  {
    q: "Is this official Snapchat+?",
    a: "Yes — the recipient gets 100% official Snapchat+ with all perks: Solar System / Planet friends, custom app icons, story rewatch indicator, custom notification sounds, priority support and more. Snapchat+ Gifter is not affiliated with Snap Inc., but delivers official entitlements.",
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
