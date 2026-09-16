import { useState } from 'react'
import { Outlet } from 'react-router'
import { Header } from '@/components/common/header'
import { Sidebar } from '@/components/common/sidebar'

export const MainLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="relative size-full bg-black flex min-h-dvh flex-col">
      <Header
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => setIsMenuOpen((prev) => !prev)}
      />
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <main className="relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col px-4">
        <Outlet />
      </main>
    </div>
  )
}
