import { Link } from 'react-router'
import { MenuIcon, XIcon } from 'lucide-react'
import { ConnectKitButton } from 'connectkit'
import { formatAddress } from '@/lib/utils'
import { Button } from '../ui/button'
import type React from 'react'
import { m } from '@/paraglide/messages.js'

interface HeaderProps {
  isMenuOpen: boolean
  onToggleMenu: () => void
}

export const Header: React.FC<HeaderProps> = ({ isMenuOpen, onToggleMenu }) => {
  return (
    <header className="sticky inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-b-[#484B51] bg-[#070808] px-4">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          aria-label={isMenuOpen ? m.close_menu() : m.open_menu()}
          aria-expanded={isMenuOpen}
          onClick={onToggleMenu}
          className="cursor-pointer active:opacity-85 transition-opacity"
        >
          <div
            className={`transition-transform duration-300 ease-in-out ${
              isMenuOpen ? 'rotate-90' : 'rotate-0'
            }`}
          >
            {isMenuOpen ? (
              <XIcon className="size-6" />
            ) : (
              <MenuIcon className="size-6" />
            )}
          </div>
        </button>
      </div>
      <div className="flex shrink-0 items-center space-x-2">
        {/* shadow-[0_3px_0_0_#963000] */}
        <Link
          to="/launch"
          className="cursor-pointer bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] px-6 py-1.5 text-sm font-semibold transition-all active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA546]"
        >
          {m.create_token()}
        </Link>
        <ConnectKitButton.Custom>
          {({ isConnected, show, address, ensName, unsupported }) => {
            if (!isConnected) {
              return (
                <Button
                  onClick={show}
                  type="button"
                  className="cursor-pointer border text-foreground border-[#FE810B] bg-[#FD810B1A] px-6 py-1.5 text-sm font-semibold transition-all active:translate-y-0.5 hover:bg-[#FD810B33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA546]"
                >
                  {m.connect_wallet()}
                </Button>
              )
            }

            if (unsupported) {
              return (
                <button
                  onClick={show}
                  type="button"
                  className="cursor-pointer border border-rose-500 bg-rose-500/10 px-4 py-1.5 text-sm font-semibold text-rose-500 transition-all active:translate-y-0.5 hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  {m.network_error()}
                </button>
              )
            }

            return (
              <button
                onClick={show}
                type="button"
                className="cursor-pointer border border-[#FE810B] bg-[#FD810B1A] px-4 py-1.5 text-sm font-semibold transition-all active:translate-y-0.5 hover:bg-[#FD810B33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA546]"
              >
                {ensName ?? formatAddress(address)}
              </button>
            )
          }}
        </ConnectKitButton.Custom>
      </div>
    </header>
  )
}
