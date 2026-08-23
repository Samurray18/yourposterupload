import { motion } from "framer-motion"
import { Gift, Search, Sparkles } from "lucide-react"

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Pick a friend",
    desc: "Enter their Snapchat username — we validate it instantly, no password or login needed.",
  },
  {
    icon: Sparkles,
    step: "02",
    title: "Choose a plan",
    desc: "1, 3, 6 or 12 months. Add a personal gift note and pick when to deliver — now or scheduled.",
  },
  {
    icon: Gift,
    step: "03",
    title: "Gift delivered",
    desc: "They get notified on Snapchat and can activate Plus in one tap. You get a confirmation with gift ID.",
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 overflow-hidden border-y border-white/5 bg-white/[0.02] py-24"
    >
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-snap/5 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/60">
            How it works
          </span>
          <h2 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Three taps to{" "}
            <span className="bg-gradient-to-r from-snap to-snap-deep bg-clip-text text-transparent">
              gift Plus
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/55">
            No passwords, no complicated steps. Just a username and a gift that arrives in seconds.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative rounded-3xl border border-white/10 bg-[#0b0b10]/60 p-7"
            >
              <span className="absolute right-6 top-5 font-mono text-5xl font-black text-white/5">
                {s.step}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-snap text-[#0b0b10] shadow-[0_0_28px_-6px_rgba(255,252,0,0.8)]">
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-snap/40 md:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
