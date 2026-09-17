import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { m } from '@/paraglide/messages.js'
import { getLocale, setLocale } from '@/paraglide/runtime.js'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { label: () => m.nav_home(), path: '/board' },
  { label: () => m.nav_launch(), path: '/launch' },
  { label: () => m.nav_dashboard(), path: '/dashboard' },
]

const languages = [
  { locale: 'zh-TW', label: () => m.language_zh_tw() },
  { locale: 'en', label: () => m.language_english() },
] as const

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [isLangOpen, setIsLangOpen] = useState(false)
  const currentLocale = getLocale()
  const currentLanguage =
    languages.find(({ locale }) => locale === currentLocale) ?? languages[1]

  useEffect(() => {
    if (!isOpen) return

    const scrollY = window.scrollY
    const { body } = document
    const originalOverflow = body.style.overflow
    const originalPosition = body.style.position

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.insetBlockStart = `-${scrollY}px`
    body.style.inlineSize = '100%'

    return () => {
      body.style.overflow = originalOverflow
      body.style.position = originalPosition
      body.style.insetBlockStart = ''
      body.style.inlineSize = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      modal={false}
      swipeDirection="left"
    >
      <DrawerContent className="bg-[#070808] data-[swipe-direction=left]:border-r-0 top-16! bottom-0! w-full!">
        <DrawerTitle className="sr-only">{m.sidebar_menu()}</DrawerTitle>

        <nav className="flex flex-1 flex-col overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className="flex items-center justify-between border-b border-b-[#303236] px-6 py-6 text-white transition-colors hover:bg-white/5 active:bg-white/10"
            >
              <span className="text-base">{item.label()}</span>
              <ArrowUpRight className="size-5 text-white" />
            </Link>
          ))}

          <div className="relative border-b border-b-[#303236]">
            <button
              type="button"
              onClick={() => setIsLangOpen((prev) => !prev)}
              className="flex w-full cursor-pointer items-center justify-between p-6 text-white transition-colors hover:bg-white/5 active:bg-white/10"
            >
              <span className="text-base">{m.language()}</span>
              <div className="flex items-center space-x-1.5 text-base text-[#A0A3A7]">
                <span>{currentLanguage.label()}</span>
                <ChevronRight
                  className={`size-5 text-white transition-transform duration-200 ${
                    isLangOpen ? 'rotate-90' : 'rotate-0'
                  }`}
                />
              </div>
            </button>

            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-6 top-full z-50 mt-1 w-32 rounded-lg border border-[#303236] bg-[#141517] p-1.5 shadow-2xl"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.locale}
                      type="button"
                      onClick={() => {
                        setLocale(lang.locale)
                        setIsLangOpen(false)
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                        currentLocale === lang.locale
                          ? 'bg-white/10 font-semibold text-white'
                          : 'text-neutral-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{lang.label()}</span>
                      {currentLocale === lang.locale && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FE810B]" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </DrawerContent>
    </Drawer>
  )
}
