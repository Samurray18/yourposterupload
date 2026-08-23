import { Ghost, Lock, MessageSquare } from "lucide-react"
import { SnapGhost } from "./SnapGhost"

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-white/[0.02]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <a href="#top" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-snap text-[#0b0b10]">
                <SnapGhost className="h-5 w-5" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-white">
                Snapchat<span className="text-snap">+ Gifter</span>
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
              Gift Snapchat+ to anyone — instant delivery, secure payment, and a personal message. The perfect flex for your best friends.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-white/40">
              <Lock className="h-3.5 w-3.5 text-snap" />
              Secure checkout · Instant delivery · No password needed
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/60">
              {[
                { label: "Features", href: "#features" },
                { label: "How it works", href: "#how-it-works" },
                { label: "Gift tool", href: "#tool" },
                { label: "FAQ", href: "#faq" },
              ].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="transition-colors hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/60">
              {["Privacy policy", "Terms of service", "Contact support"].map((l) => (
                <li key={l}>
                  <a href="#top" className="transition-colors hover:text-white">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/40">
              <MessageSquare className="h-4 w-4 shrink-0 text-snap" />
              45K+ Snapchat+ gifts sent so far
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-white/35 sm:flex-row">
          <p>© {new Date().getFullYear()} Snapchat+ Gifter. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <Ghost className="h-3.5 w-3.5" />
            Not affiliated with Snap Inc.
          </p>
        </div>
      </div>
    </footer>
  )
}