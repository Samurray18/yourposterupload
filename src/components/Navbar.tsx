import { Menu, X } from "lucide-react"
import { useState } from "react"
import { SnapGhost } from "./SnapGhost"

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#tool", label: "Gift tool" },
  { href: "#faq", label: "FAQ" },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0b0b10]/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <a href="#top" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-snap text-[#0b0b10] shadow-[0_0_24px_-4px_rgba(255,252,0,0.7)] transition-transform group-hover:scale-105">
            <SnapGhost className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Snapchat<span className="text-snap">+ Gifter</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:block">
          <a
            href="#tool"
            className="rounded-full bg-snap px-5 py-2 text-sm font-bold text-[#0b0b10] shadow-[0_0_28px_-6px_rgba(255,252,0,0.8)] transition-all hover:brightness-110"
          >
            Send a gift
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white md:hidden active:bg-white/10"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/5 bg-[#0b0b10]/95 px-4 pb-4 pt-2 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#tool"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-full bg-snap px-5 py-2.5 text-center text-sm font-bold text-[#0b0b10]"
          >
            Send a gift
          </a>
        </div>
      )}
    </header>
  )
}