import { AnimatePresence, motion } from "framer-motion"
import {
  Check,
  ChevronRight,
  Gift,
  Loader2,
  Lock,
  Sparkles,
  ShieldCheck,
  User,
  CreditCard,
  Clock,
  Copy,
  MessageSquareHeart,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { SnapGhost } from "./SnapGhost"

type Phase = "idle" | "gifting" | "success"

type Plan = {
  id: string
  months: number
  price: string
  perMonth: string
  popular?: boolean
}

const plans: Plan[] = [
  { id: "1m", months: 1, price: "$3.99", perMonth: "$3.99/mo" },
  { id: "3m", months: 3, price: "$10.99", perMonth: "$3.66/mo", popular: true },
  { id: "6m", months: 6, price: "$19.99", perMonth: "$3.33/mo" },
  { id: "12m", months: 12, price: "$35.99", perMonth: "$3.00/mo" },
]

const giftingSteps = [
  { icon: User, label: "Validating Snapchat username" },
  { icon: CreditCard, label: "Processing secure payment" },
  { icon: Gift, label: "Delivering Snapchat+ gift" },
  { icon: ShieldCheck, label: "Confirming activation" },
]

function GiftingScreen() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= giftingSteps.length - 1) {
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
          <Gift className="h-9 w-9" />
        </span>
      </div>

      <h3 className="mt-6 text-2xl font-black text-white">
        Sending your gift<span className="text-snap">…</span>
      </h3>
      <p className="mt-2 text-sm text-white/50">
        This usually takes a few seconds. Don&apos;t close the tab.
      </p>

      <div className="mt-8 w-full max-w-sm space-y-3 text-left">
        {giftingSteps.map((s, i) => {
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
          animate={{ width: `${((step + 1) / giftingSteps.length) * 100}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <p className="mt-3 text-xs text-white/40">
        Step {step + 1} of {giftingSteps.length} · Encrypted & secure
      </p>
    </div>
  )
}

function SuccessScreen({
  username,
  plan,
  message,
  onReset,
}: {
  username: string
  plan: Plan
  message: string
  onReset: () => void
}) {
  const [copied, setCopied] = useState(false)
  const giftId = `SC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`

  function handleCopy() {
    navigator.clipboard.writeText(giftId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="text-left">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white">
          <Check className="h-8 w-8" />
        </span>
        <h3 className="mt-4 text-2xl font-black text-white">Gift sent! 🎉</h3>
        <p className="mt-2 text-sm text-white/60">
          You gifted <span className="font-bold text-snap">{plan.months} month{plan.months > 1 ? "s" : ""} of Snapchat+</span> to{" "}
          <span className="font-bold text-white">@{username}</span>
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-snap/20 bg-gradient-to-br from-snap/15 via-white/[0.03] to-snap/5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-snap text-[#0b0b10]">
              <Gift className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black text-white">Snapchat+ Gift Card</p>
              <p className="text-xs text-white/50">{plan.months} months · {plan.price} · Gift ID {giftId}</p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-black/30 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-snap">
            <MessageSquareHeart className="h-3.5 w-3.5" />
            Your gift message
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            {message.trim() || "Enjoy Snapchat+ on me! 🪐 You deserve all the planets bestie 💛"}
          </p>
          <p className="mt-3 text-xs text-white/40">Delivered instantly to @{username} · They can activate in one tap on Snapchat</p>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-xs">
          <span className="flex items-center gap-1.5 text-white/60">
            <Clock className="h-3.5 w-3.5 text-snap" />
            Delivery status
          </span>
          <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-bold text-green-400">Delivered ✓</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Plan", value: `${plan.months} mo` },
          { label: "Price", value: plan.price },
          { label: "Expires", value: "Never" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] py-3">
            <p className="text-xs uppercase tracking-widest text-white/40">{s.label}</p>
            <p className="mt-1 text-sm font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-white/35">
        <Lock className="h-3.5 w-3.5" />
        Payment encrypted · Gift is redeemable only by @{username} · Support 24/7
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-snap px-6 py-3 text-sm font-bold text-[#0b0b10] hover:brightness-110"
        >
          <Gift className="h-4 w-4" />
          Send another gift
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          Download receipt
        </button>
      </div>
    </div>
  )
}

export function RecoveryTool() {
  const [username, setUsername] = useState("")
  const [planId, setPlanId] = useState<string>("3m")
  const [giftMessage, setGiftMessage] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const selectedPlan = plans.find((p) => p.id === planId) ?? plans[1]!

  useEffect(() => {
    if (phase === "success" && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [phase])

  function startGifting(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) {
      setError(true)
      return
    }
    setError(false)
    setPhase("gifting")
    window.setTimeout(() => setPhase("success"), 4000)
  }

  function reset() {
    setPhase("idle")
    setUsername("")
    setGiftMessage("")
    setPlanId("3m")
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
            Snapchat+ Gifter
          </span>
          <h2 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Gift Snapchat+{" "}
            <span className="bg-gradient-to-r from-snap to-snap-deep bg-clip-text text-transparent">
              now
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/55">
            Enter their username, pick a plan, add a note — we deliver the Snapchat+ gift instantly.
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
              secure gifting
            </span>
            <span className="ml-auto hidden items-center gap-1 text-xs text-white/30 sm:flex">
              <ShieldCheck className="h-3 w-3 text-green-400" />
              Encrypted payment
            </span>
          </div>

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {phase === "idle" && (
                <motion.form
                  key="idle"
                  onSubmit={startGifting}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-6"
                >
                  <div>
                    <label
                      htmlFor="snap-username"
                      className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white/80"
                    >
                      <User className="h-4 w-4 text-snap" />
                      Friend&apos;s Snapchat username
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
                        Enter a username to send the gift to.
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white/80">
                      <Sparkles className="h-4 w-4 text-snap" />
                      Choose a plan
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {plans.map((p) => {
                        const active = p.id === planId
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPlanId(p.id)}
                            className={`relative rounded-2xl border p-4 text-center transition-all ${
                              active
                                ? "border-snap bg-snap/15 shadow-[0_0_20px_-8px_rgba(255,252,0,0.6)]"
                                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                            }`}
                          >
                            {p.popular && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-snap px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wider text-[#0b0b10]">
                                Popular
                              </span>
                            )}
                            <p className={`text-lg font-black ${active ? "text-white" : "text-white/90"}`}>{p.months} mo</p>
                            <p className="mt-1 text-sm font-bold text-snap">{p.price}</p>
                            <p className="text-[0.65rem] text-white/40">{p.perMonth}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="gift-message" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white/80">
                      <MessageSquareHeart className="h-4 w-4 text-snap" />
                      Gift message <span className="text-white/40 font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="gift-message"
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      placeholder="Happy birthday! Enjoy planets on me 🪐💛"
                      rows={2}
                      maxLength={120}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-snap/50 focus:ring-2 focus:ring-snap/30"
                    />
                    <p className="mt-1 text-right text-xs text-white/30">{giftMessage.length}/120</p>
                  </div>

                  <button
                    type="submit"
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-snap px-6 py-4 text-base font-extrabold text-[#0b0b10] shadow-[0_0_40px_-10px_rgba(255,252,0,0.9)] transition-all hover:brightness-110"
                  >
                    <Gift className="h-5 w-5" />
                    Gift Snapchat+ · {selectedPlan.price}
                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>

                  <p className="flex flex-wrap items-center justify-center gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-snap" /> Secure checkout</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-snap" /> Delivers in seconds</span>
                    <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-snap" /> No password needed</span>
                  </p>
                </motion.form>
              )}

              {phase === "gifting" && (
                <motion.div
                  key="gifting"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <GiftingScreen />
                </motion.div>
              )}

              {phase === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <SuccessScreen username={username.trim()} plan={selectedPlan} message={giftMessage} onReset={reset} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
