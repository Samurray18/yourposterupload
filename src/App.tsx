import { FAQ } from "./components/FAQ"
import { Features } from "./components/Features"
import { Footer } from "./components/Footer"
import { Hero } from "./components/Hero"
import { HowItWorks } from "./components/HowItWorks"
import { Navbar } from "./components/Navbar"
import { RecoveryTool } from "./components/RecoveryTool"

function App() {
  return (
    <div className="min-h-screen bg-[#0b0b10] font-sans text-white antialiased">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <RecoveryTool />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}

export default App