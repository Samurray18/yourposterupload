import { AnimatePresence, motion } from "framer-motion"
import {
  Check,
  ChevronRight,
  Download,
  FileSearch,
  Ghost,
  Loader2,
  Lock,
  MessageSquare,
  ScanSearch,
  ShieldCheck,
  User,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { SnapGhost } from "./SnapGhost"

type Phase = "idle" | "scanning" | "results"

const scanSteps = [
  { icon: ScanSearch, label: "Locating Snapchat local data" },
  { icon: FileSearch, label: "Scanning chat databases" },
  { icon: MessageSquare, label: "Rebuilding deleted threads" },
  { icon: ShieldCheck, label: "Verifying recovered messages" },
]

const chats = [
  {
    name: "Maya",
    handle: "@maya.2020",
    messages: 248,
    period: "Jul 2019 – Jan 2021",
    gradient: "linear-gradient(135deg,#fffc00,#ffd600)",
    preview: [
      { from: "them", text: "remember our streak? we hit 512 🔥", date: "Aug 14, 2020" },
      { from: "me", text: "no way we still have those screenshots", date: "Aug 14, 2020" },
      { from: "them", text: "recovered them! sending now", date: "Aug 14, 2020" },
    ],
  },
  {
    name: "Leo",
    handle: "@leo.beach",
    messages: 189,
    period: "Jan 2020 – Jun 2020",
    gradient: "linear-gradient(135deg,#ff3b5c,#ff9f43)",
    preview: [
      { from: "them", text: "that trip was insane 🏖️", date: "Mar 03, 2020" },
      { from: "me", text: "best summer ever, glad we kept these", date: "Mar 03, 2020" },
      { from: "them", text: "haha the 2am snaps though 😂", date: "Mar 03, 2020" },
    ],
  },
  {
    name: "Sara",
    handle: "@sara._uno",
    messages: 156,
    period: "May 2018 – Dec 2018",
    gradient: "linear-gradient(135deg,#8b5cf6,#ec4899)",
    preview: [
      { from: "them", text: "you still have our old convos??", date: "May 22, 2018" },
      { from: "me", text: "just got them back actually!!", date: "May 22, 2018" },
      { from: "them", text: "send the whole thread, I lost mine too", date: "May 22, 2018" },
    ],
  },
]

function ScanScreen() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= scanSteps.length - 1) {
          clearInterval(id)
          return s
        }
        return s + 1
      })
    }, 900)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-3xl bg-snap/20" />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-snap text-[#0b0b10] shadow-[0_0_40px_-8px_rgba(255,252,0,0.9)]">
          <Ghost className="h-9 w-9" />
        </span>
      </div>

      <h3 className="mt-6 text-2xl font-black text-white">
        Scanning your device<span className="text-snap">…</span>
      </h3>
      <p className="mt-2 text-sm text-white/50">
        This usually takes under a minute. Keep the tab open.
      </p>

      <div className="mt-8 w-full max-w-sm space-y-3 text-left">
        {scanSteps.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <div
              key={s.label}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 ${
                active
                  ? "border-snap/50 bg-snap/10"
                  : done
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-white/5 bg-white/[0.02] opacity-50"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  done
                    ? "bg-green-500/20 text-green-400"
                    : active
                      ? "bg-snap/20 text-snap"
                      : "bg-white/5 text-white/30"
                }`}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <s.icon className="h-4 w-4" />
                )}
              </span>
              <span
                className={`text-sm font-medium ${done || active ? "text-white" : "text-white/40"}`}
              >
                {s.label}
              </span>
              {done && (
                <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-green-400">
                  Done
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-snap to-snap-deep"
          initial={{ width: "8%" }}
          animate={{ width: `${((step + 1) / scanSteps.length) * 100}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <p className="mt-3 text-xs text-white/40">
        Step {step + 1} of {scanSteps.length} · Encrypted on-device
      </p>
    </div>
  )
}

function ResultsScreen({
  username,
  onReset,
}: {
  username: string
  onReset: () => void
}) {
  const [downloaded, setDownloaded] = useState(false)

  return (
    <div className="text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-2xl font-black text-white">
            <Check className="h-6 w-6 rounded-full bg-green-500 p-1 text-[#0b0b10]" />
            Recovery complete
          </h3>
          <p className="mt-1 text-sm text-white/50">
            Found <span className="font-bold text-snap">593 messages</span> for{" "}
            <span className="font-bold text-white">@{username}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDownloaded(true)}
          className="inline-flex items-center gap-2 rounded-full bg-snap px-5 py-2.5 text-sm font-bold text-[#0b0b10] transition-all hover:brightness-110"
        >
          {downloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {downloaded ? "Exported!" : "Export all"}
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {chats.map((c) => (
          <div
            key={c.handle}
            className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition-colors hover:border-snap/30"
          >
            <div className="flex items-center gap-4 p-5">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-black text-[#0b0b10]"
                style={{ background: c.gradient }}
              >
                {c.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-bold text-white">{c.name}</p>
                  <span className="rounded-full bg-snap/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-snap">
                    {c.messages} messages
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-white/40">
                  {c.handle} · {c.period}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition-transform group-hover:translate-x-1" />
            </div>

            <div className="space-y-2 border-t border-white/5 bg-black/20 p-5">
              {c.preview.map((m, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[0.55rem] font-bold text-white/60">
                    {m.from === "me" ? "You" : c.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/80">{m.text}</p>
                    <p className="mt-0.5 text-[0.65rem] text-white/35">{m.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-white/35">
        <Lock className="h-3.5 w-3.5" />
        Exports are encrypted and stored only on your device.
      </p>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-semibold text-snap hover:underline"
        >
          Start a new scan
        </button>
      </div>
    </div>
  )
}

export function RecoveryTool() {
  const [username, setUsername] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (phase === "results" && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [phase])

  function startScan(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) {
      setError(true)
      return
    }
    setError(false)
    setPhase("scanning")
    window.setTimeout(() => setPhase("results"), 4600)
  }

  function reset() {
    setPhase("idle")
    setUsername("")
  }

  return (
    <section id="tool" className="relative mx-auto max-w-3xl scroll-mt-24 px-4 py-24 sm:px-6">
      <div className="pointer-events-none absolute -top-10 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-snap/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-snap/30 bg-snap/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-snap">
            <SnapGhost className="h-3.5 w-3.5" />
            Free recovery tool
          </span>
          <h2 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Recover your chats{" "}
            <span className="bg-gradient-to-r from-snap to-snap-deep bg-clip-text text-transparent">
              now
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/55">
            Enter the Snapchat username you want to scan for. The entire process runs locally on
            your device.
          </p>
        </div>

        <div
          ref={resultsRef}
          className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-5 py-3">
            <span className="h-3 w-3 rounded-full bg-snap-red/70" />
            <span className="h-3 w-3 rounded-full bg-snap" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-3 flex items-center gap-1.5 text-xs text-white/40">
              <Lock className="h-3 w-3" />
              secure scan
            </span>
          </div>

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {phase === "idle" && (
                <motion.form
                  key="idle"
                  onSubmit={startScan}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-5"
                >
                  <div className="w-full">
                    <label
                      htmlFor="snap-username"
                      className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white/80"
                    >
                      <User className="h-4 w-4 text-snap" />
                      Snapchat username
                    </label>
                    <input
                      id="snap-username"
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value)
                        setError(false)
                      }}
                      placeholder="e.g. jessica.2020"
                      autoComplete="off"
                      className={`h-13 w-full rounded-2xl border bg-white/5 px-5 py-3.5 text-white placeholder:text-white/30 outline-none transition-colors focus:ring-2 ${
                        error
                          ? "border-snap-red/60 focus:ring-snap-red/40"
                          : "border-white/10 focus:border-snap/50 focus:ring-snap/30"
                      }`}
                    />
                    {error && (
                      <p className="mt-2 text-xs font-medium text-snap-red">
                        Enter a username to start the scan.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-snap px-6 py-4 text-base font-extrabold text-[#0b0b10] shadow-[0_0_40px_-10px_rgba(255,252,0,0.9)] transition-all hover:brightness-110"
                  >
                    <ScanSearch className="h-5 w-5" />
                    Start scanning
                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>

                  <p className="flex items-center gap-1.5 text-xs text-white/40">
                    <ShieldCheck className="h-3.5 w-3.5 text-snap" />
                    Demo preview — runs locally, nothing is uploaded.
                  </p>
                </motion.form>
              )}

              {phase === "scanning" && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <ScanScreen />
                </motion.div>
              )}

              {phase === "results" && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <ResultsScreen username={username.trim()} onReset={reset} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  )
}