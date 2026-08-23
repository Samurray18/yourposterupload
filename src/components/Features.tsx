import { motion } from "framer-motion"
import {
  Clock,
  Gift,
  Globe,
  Heart,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react"

const features = [
  {
    icon: Gift,
    title: "Instant gifting",
    desc: "Your gift is delivered within seconds — the recipient gets notified directly on Snapchat.",
  },
  {
    icon: Star,
    title: "All Plus perks",
    desc: "Planets, custom app icons, story rewatch count, custom notification sounds & more.",
  },
  {
    icon: Heart,
    title: "Personal message",
    desc: "Add a custom gift note that appears with the Snapchat+ delivery.",
  },
  {
    icon: ShieldCheck,
    title: "Secure payment",
    desc: "Pay safely with Apple Pay, Google Pay or card. Encrypted and private — we never store passwords.",
  },
  {
    icon: Clock,
    title: "Schedule a gift",
    desc: "Send now or schedule for a birthday — we'll deliver exactly on time.",
  },
  {
    icon: Globe,
    title: "Works worldwide",
    desc: "Gift Snapchat+ to any username in any country. No region limits.",
  },
]

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/60">
          <Sparkles className="h-3.5 w-3.5 text-snap" />
          Why gift Plus?
        </span>
        <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
          More than a gift,{" "}
          <span className="bg-gradient-to-r from-snap to-snap-deep bg-clip-text text-transparent">
            it&apos;s a flex
          </span>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-white/55">
          Snapchat+ Gifter is the fastest way to give premium Snapchat+ — planets, priority features and exclusive customizations in one tap.
        </p>
      </motion.div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-snap/40 hover:bg-white/[0.05]"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-snap/5 blur-2xl transition-all group-hover:bg-snap/10" />
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-snap/10 text-snap shadow-[inset_0_0_0_1px_rgba(255,252,0,0.15)]">
              <f.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-5 text-lg font-bold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mt-14 flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-gradient-to-r from-snap/10 via-white/5 to-snap-red/10 p-8 text-center sm:flex-row sm:gap-5"
      >
        <Gift className="h-10 w-10 shrink-0 text-snap" />
        <p className="max-w-xl text-base text-white/70">
          <span className="font-bold text-white">Heads up:</span> Snapchat+ gifts stack — if they already have Plus, we extend their subscription. No waste.
        </p>
      </motion.div>
    </section>
  )
}
