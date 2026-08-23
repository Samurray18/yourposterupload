import { motion, type Variants } from "framer-motion"
import { ArrowRight, Gift, Lock, ShieldCheck, Zap } from "lucide-react"

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

const bubbles = [
  { text: "Gifted you Snapchat+ 💛", delay: "0s", left: "0%", bottom: "62%", float: 6 },
  { text: "omg thank you!! 😍", delay: "1.6s", left: "34%", bottom: "70%", float: 8 },
  { text: "check your Snapchat ✨", delay: "3.2s", left: "6%", bottom: "40%", float: 5 },
  { text: "you're my #1 best friend 🪐", delay: "2.4s", left: "52%", bottom: "46%", float: 7 },
  { text: "12 months unlocked 🎁", delay: "4s", left: "28%", bottom: "22%", float: 6 },
]

function PhoneMockup() {
  return (
    <motion.div
      variants={fadeUp}
      className="relative mx-auto w-full max-w-[19rem]"
      aria-hidden="true"
    >
      {bubbles.map((b) => (
        <motion.div
          key={b.text}
          className="absolute z-0"
          style={{ left: b.left, bottom: b.bottom }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: parseFloat(b.delay) + 0.6, duration: 0.5 }}
        >
          <div
            className="whitespace-nowrap rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80 shadow-xl backdrop-blur-md"
            style={{ animation: `float ${b.float}s ease-in-out infinite` }}
          >
            {b.text}
          </div>
        </motion.div>
      ))}

      <motion.div
        className="relative z-10 rounded-[2.4rem] border-[6px] border-zinc-800 bg-[#16161c] shadow-2xl"
        initial={{ opacity: 0, y: 40, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: -3 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ animation: "float 7s ease-in-out infinite" }}
      >
        <div className="absolute left-1/2 top-2 h-4 w-20 -translate-x-1/2 rounded-full bg-zinc-800" />
        <div className="space-y-3 p-5 pt-9">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-snap text-[#0b0b10]">
              <Gift className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[0.65rem] font-bold text-white">Snapchat+ Gift</p>
              <p className="text-[0.6rem] text-green-400">● delivered instantly</p>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-snap to-yellow-400 p-3 text-[#0b0b10]">
            <p className="text-xs font-black">You gifted 3 Months 🎉</p>
            <p className="mt-1 text-[0.65rem] font-medium opacity-80">To @maya.2020 · Custom app icons + Planet system 🪐</p>
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-[#26262e] px-3 py-2 text-xs text-white/85">
            no way you got me Plus 😭💛
          </div>
          <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-snap px-3 py-2 text-xs font-medium text-[#0b0b10]">
            enjoy your planets bestie 🪐✨
          </div>
          <div className="pt-1 text-center text-[0.6rem] text-white/40">
            Gift ID #SC-4928 · $10.99
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 top-10 h-[32rem] w-[32rem] rounded-full bg-snap/10 blur-3xl"
          style={{ animation: "aurora 10s ease-in-out infinite" }}
        />
        <div
          className="absolute -right-32 top-40 h-[28rem] w-[28rem] rounded-full bg-snap-red/10 blur-3xl"
          style={{ animation: "aurora 12s ease-in-out infinite reverse" }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-snap/30 bg-snap/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-snap"
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            Gift Snapchat+ in seconds
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="mt-6 text-5xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            Gift{" "}
            <span className="bg-gradient-to-r from-snap via-yellow-300 to-snap-deep bg-clip-text text-transparent">
              Snapchat+
            </span>{" "}
            to your friends
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg"
          >
            Surprise your best friends with a Snapchat+ subscription — planets, custom icons, story rewatch indicators and every premium perk, delivered instantly.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#tool"
              className="group inline-flex items-center gap-2 rounded-full bg-snap px-8 py-3.5 text-base font-extrabold text-[#0b0b10] shadow-[0_0_40px_-8px_rgba(255,252,0,0.9)] transition-all hover:shadow-[0_0_55px_-6px_rgba(255,252,0,1)] hover:brightness-110"
            >
              Send a gift
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#redeem"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-base font-semibold text-white/80 backdrop-blur transition-colors hover:border-white/30 hover:text-white"
            >
              Receive a gift
            </a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3"
          >
            {[
              { icon: Gift, label: "Instant delivery" },
              { icon: ShieldCheck, label: "Secure payment" },
              { icon: Lock, label: "No password needed" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-2 text-sm text-white/50">
                <Icon className="h-4 w-4 text-snap" />
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <PhoneMockup />
      </div>

      <div className="relative border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center sm:px-6 md:grid-cols-4">
          {[
            { value: "45K+", label: "Gifts sent" },
            { value: "99%", label: "Instant delivery rate" },
            { value: "12K", label: "Happy recipients" },
            { value: "4.9★", label: "Average rating" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <p className="text-3xl font-black text-white sm:text-4xl">
                <span className="text-snap">{s.value}</span>
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/40">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
