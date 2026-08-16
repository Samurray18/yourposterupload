import { motion } from "framer-motion"
import {
  Camera,
  FileSearch,
  Ghost,
  Heart,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react"

const features = [
  {
    icon: MessageSquareText,
    title: "Full DM history",
    desc: "Every chat you thought was gone — recovered in chronological order, including deleted threads.",
  },
  {
    icon: Camera,
    title: "Photos & videos",
    desc: "Screenshots, snaps and media attachments that expired years ago, pulled back from device caches.",
  },
  {
    icon: Timer,
    title: "Streaks restored",
    desc: "See your longest streaks and old best friends lists rebuilt from recovered interaction data.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy first",
    desc: "Everything runs locally on your device. We never see, store, or transmit your chats.",
  },
  {
    icon: FileSearch,
    title: "Deep scan engine",
    desc: "Our recovery engine searches app caches, backups and database remnants most tools miss.",
  },
  {
    icon: Heart,
    title: "Old memories",
    desc: "Reconnect with conversations and people you thought you'd never hear from again.",
  },
]

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/60">
          <Sparkles className="h-3.5 w-3.5 text-snap" />
          Features
        </span>
        <h2 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Everything you lost,{" "}
          <span className="bg-gradient-to-r from-snap to-snap-deep bg-clip-text text-transparent">
            found
          </span>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-white/55">
          SnapRecover digs through the data already on your phone to bring back the messages you
          thought were deleted forever.
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
        <Ghost className="h-10 w-10 shrink-0 text-snap" />
        <p className="max-w-xl text-base text-white/70">
          <span className="font-bold text-white">Heads up:</span> recovery works best when you have
          the Snapchat app installed — our scan reads the local data it leaves behind.
        </p>
      </motion.div>
    </section>
  )
}