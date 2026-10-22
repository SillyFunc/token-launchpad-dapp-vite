import { Link } from 'react-router'
import iconCloverUrl from '@/assets/svgs/icon-clover.svg?url'
import { MenuIcon, XIcon } from 'lucide-react'
import { ConnectKitButton } from 'connectkit'
import type React from 'react'
import { useState } from 'react'
import { useConnection } from 'wagmi'
import { WalletMenu } from '@/components/common/wallet-menu'
import { m } from '@/paraglide/messages.js'

interface HeaderProps {
  isMenuOpen: boolean
  onToggleMenu: () => void
}
export const Header: React.FC<HeaderProps> = ({ isMenuOpen, onToggleMenu }) => {
  const { address } = useConnection()
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false)

  return (
    <header className="sticky inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-b-[#484B51] bg-[#070808] px-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={isMenuOpen ? m.close_menu() : m.open_menu()}
          aria-expanded={isMenuOpen}
          onClick={onToggleMenu}
          className="cursor-pointer active:opacity-85 transition-opacity size-6 relative flex items-center justify-center text-foreground"
        >
          <div
            className={`transition-transform duration-200 ${
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
        <Link
          className="flex items-center justify-center text-[#FE810B]"
          to="/board"
          aria-label="Launchpad Home"
        >
          <span
            aria-hidden
            className="block shrink-0 bg-current [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] mask-center mask-no-repeat mask-contain size-6"
            style={{
              WebkitMaskImage: `url("${iconCloverUrl}")`,
              maskImage: `url("${iconCloverUrl}")`,
            }}
          ></span>
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* shadow-[0_3px_0_0_#963000] */}
        <Link
          to={{ pathname: '/launch', search: '' }}
          className="cursor-pointer bg-[#FE810B] text-[#1A1A1A] px-6 h-9 grid place-items-center text-sm font-semibold transition-all active:translate-y-0.5 focus-visible:outline-none hover:bg-[#E87000] focus-visible:ring-2 focus-visible:ring-[#E87000]"
        >
          {m.create_token()}
        </Link>
        <ConnectKitButton.Custom>
          {({ isConnected, show }) => {
            if (!isConnected) {
              return (
                <button
                  type="button"
                  data-testid="mobile-header-wallet-button"
                  className="ui20-connect-chamfer grid h-9 w-9 shrink-0 place-items-center border border-[#FE810B] bg-background text-[#FE810B] transition-colors hover:bg-[#FE810B] hover:text-black [--ui20-chamfer-bg:#070808] [--ui20-chamfer-border:#FE810B] hover:[--ui20-chamfer-bg:#FE810B]"
                  aria-label="连接钱包"
                  onClick={show}
                >
                  <svg
                    viewBox="0 0 14.834 14.834"
                    fill="none"
                    aria-hidden="true"
                    className="size-3.75"
                  >
                    <path
                      d="M10.7503 0C11.1645 0 11.5007 0.336112 11.5007 0.750326V3.33333H14.0837C14.4979 3.33333 14.834 3.66945 14.834 4.08366V14.0837C14.834 14.4979 14.4979 14.834 14.0837 14.834H0.750326C0.336112 14.834 0 14.4979 0 14.0837V0.750326C0 0.336112 0.336112 0 0.750326 0H10.7503ZM1.50065 13.3333H13.3333V4.83398H1.50065V13.3333ZM11.4168 11.167H9.91699V7.00033H11.4168V11.167ZM1.50065 3.33333H10V1.50065H1.50065V3.33333Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </button>
              )
            } else {
              return (
                <button
                  type="button"
                  data-testid="mobile-header-wallet-button"
                  className="ui20-connect-chamfer grid h-9 w-9 shrink-0 place-items-center border border-[#FE810B] bg-background text-[#FE810B] transition-colors hover:bg-[#FE810B] hover:text-black [--ui20-chamfer-bg:#070808] [--ui20-chamfer-border:#FE810B] hover:[--ui20-chamfer-bg:#FE810B]"
                  aria-label={m.wallet_menu_open()}
                  onClick={() => setIsWalletMenuOpen(true)}
                >
                  <span
                    aria-hidden
                    className="block shrink-0 bg-current [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] mask-center mask-no-repeat mask-contain size-4.75"
                    style={{
                      WebkitMaskImage: `url("${iconCloverUrl}")`,
                      maskImage: `url("${iconCloverUrl}")`,
                    }}
                  ></span>
                </button>
              )
            }
          }}
        </ConnectKitButton.Custom>
        {address && (
          <WalletMenu
            open={isWalletMenuOpen}
            onOpenChange={setIsWalletMenuOpen}
            address={address}
          />
        )}
      </div>
    </header>
  )
}
