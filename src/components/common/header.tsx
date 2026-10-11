import { Link } from 'react-router'
import iconFireUrl from '@/assets/svgs/icon-fire.svg?url'
import { Flame, MenuIcon, Wallet, XIcon } from 'lucide-react'
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
              WebkitMaskImage: `url("${iconFireUrl}")`,
              maskImage: `url("${iconFireUrl}")`,
            }}
          ></span>
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* shadow-[0_3px_0_0_#963000] */}
        <Link
          to={{ pathname: '/launch', search: '' }}
          className="cursor-pointer bg-[#FE810B] px-6 h-9 grid place-items-center text-sm font-semibold transition-all active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA546]"
        >
          {m.create_token()}
        </Link>
        <ConnectKitButton.Custom>
          {({ isConnected, show, address, ensName, unsupported }) => {
            if (!isConnected) {
              return (
                // <Button
                //   onClick={show}
                //   type="button"
                //   className="cursor-pointer border text-foreground border-[#FE810B] bg-[#FD810B1A] px-6 py-1.5 text-sm font-semibold transition-all active:translate-y-0.5 hover:bg-[#FD810B33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA546]"
                // >
                //   {m.connect_wallet()}
                // </Button>
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
                // <button
                //   onClick={show}
                //   type="button"
                //   className="cursor-pointer border border-[#FE810B] bg-[#FD810B1A] px-4 py-1.5 text-sm font-semibold transition-all active:translate-y-0.5 hover:bg-[#FD810B33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA546]"
                // >
                //   {ensName ?? formatAddress(address)}
                // </button>
                <button
                  type="button"
                  data-testid="mobile-header-wallet-button"
                  className="ui20-connect-chamfer grid h-9 w-9 shrink-0 place-items-center border border-[#FE810B] bg-background text-[#FE810B] transition-colors hover:bg-[#FE810B] hover:text-black [--ui20-chamfer-bg:#070808] [--ui20-chamfer-border:#FE810B] hover:[--ui20-chamfer-bg:#FE810B]"
                  aria-label="我的個人資料"
                  onClick={show}
                >
                  {/* <svg
                    viewBox="76 16 360 480"
                    fill="none"
                    aria-hidden="true"
                    className="size-4.75"
                  >
                    <path
                      fill="currentColor"
                      d="M166 121c0 90 90 105 90 180 0 30-30 75-75 75s-75-45-45-120c-45 30-60 60-60 90 0 75 75 150 180 150s180-45 180-135c.67-133.125-153.4-177.596-195-240-30-45-15-75 15-105-60 15-90 57-90 105z"
                    />
                  </svg> */}
                  <svg
                    fill="none"
                    aria-hidden="true"
                    className="h-4.75"
                    viewBox="0 0 512 512"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill="currentColor"
                      d="M304.833 16c-261.69 0-320.71 387.657-62.343 387.657 86.284 0 86.955-129.375 0-129.375-139.947 0-99.134-202.896 62.343-258.282zm-30.938 92.343c-86.283 0-86.955 129.375 0 129.375 139.95 0 88.353 202.896-73.125 258.282 261.69 0 331.49-387.657 73.125-387.657z"
                    />
                  </svg>
                </button>
              )
            }

            // if (unsupported) {
            //   return (
            //     <button
            //       onClick={show}
            //       type="button"
            //       className="cursor-pointer border border-rose-500 bg-rose-500/10 px-4 py-1.5 text-sm font-semibold text-rose-500 transition-all active:translate-y-0.5 hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            //     >
            //       {m.network_error()}
            //     </button>
            //   )
            // }
          }}
        </ConnectKitButton.Custom>
      </div>
    </header>
  )
}
