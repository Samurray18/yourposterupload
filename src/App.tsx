import { FAQ } from "./components/FAQ"
import { Features } from "./components/Features"
import { Footer } from "./components/Footer"
import { GiftRedeem } from "./components/GiftRedeem"
import { Hero } from "./components/Hero"
import { HowItWorks } from "./components/HowItWorks"
import { Navbar } from "./components/Navbar"
import { RecoveryTool } from "./components/RecoveryTool"
import { useEffect } from "react"

function App() {
  useEffect(() => {
    const removeLovableBadge = () => {
      const selectors = [
        "#lovable-badge",
        "[data-lovable-badge]",
        "a[href*='lovable.dev']",
        "a[href*='lovable.app']",
        "iframe[src*='lovable']",
      ]
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => el.remove())
      })
      // Fallback: text content search for "Edit with Lovable"
      document.querySelectorAll("a, button, div").forEach((el) => {
        if (el.textContent?.toLowerCase().includes("edit with lovable")) {
          const container = el.closest("div") as HTMLElement | null
          // remove the badge container (usually fixed bottom-right)
          if (container) {
            const style = window.getComputedStyle(container)
            if (style.position === "fixed" || el.textContent!.length < 50) {
              ;(container.parentElement || el).remove()
              el.remove()
            }
          }
        }
      })
    }

    removeLovableBadge()
    const observer = new MutationObserver(removeLovableBadge)
    observer.observe(document.body, { childList: true, subtree: true })
    const interval = window.setInterval(removeLovableBadge, 1000)
    return () => {
      observer.disconnect()
      clearInterval(interval)
    }
  }, [])
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0b10] font-sans text-white antialiased">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <RecoveryTool />
        <GiftRedeem />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}

export default App