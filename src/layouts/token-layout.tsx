import { useState } from 'react'
import { Header } from '@/components/common/header'
import { Sidebar } from '@/components/common/sidebar'

export function TokenLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="relative size-full bg-black text-white flex min-h-dvh flex-col">
      <Header
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => setIsMenuOpen((open) => !open)}
      />
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <main className="min-h-0 flex-1 overflow-hidden flex flex-col bg-[#070808] pb-4">
        {children}
      </main>
    </div>
  )
}
