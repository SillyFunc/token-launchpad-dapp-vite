import { useNavigate } from 'react-router'
import { Check, Copy, ExternalLink, LogOut, LucideX, User } from 'lucide-react'
import type { Address } from 'viem'
import { useDisconnect } from 'wagmi'

import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getExplorerAddressUrl } from '@/lib/web3'
import { m } from '@/paraglide/messages.js'

export interface WalletMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  address: Address
}

export const WalletMenu: React.FC<WalletMenuProps> = ({
  open,
  onOpenChange,
  address,
}) => {
  const navigate = useNavigate()
  const { mutate: disconnect } = useDisconnect()
  const { copy, copiedText } = useCopyToClipboard()
  const explorerUrl = getExplorerAddressUrl(address)
  const copied = copiedText === address

  const close = () => onOpenChange(false)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className=" text-white bg-transparent border-none flex flex-col">
        <div className="flex justify-end">
          <button
            type="button"
            aria-label="关闭"
            onClick={close}
            className="grid h-8 w-8 shrink-0 place-items-center bg-[#FE810B] text-[#070808] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#FE810B]"
          >
            <LucideX className="size-6" />
          </button>
        </div>

        <div className="flex flex-col border-t border-[#FE810B] bg-[#070808] w-full">
          <button
            type="button"
            className="flex w-full px-6 pt-8 pb-5 shrink-0 items-center gap-2 text-left text-sm font-normal leading-normal text-white transition-colors hover:bg-[#131516] focus-visible:bg-[#131516] focus-visible:outline-none"
            onClick={() => {
              close()
              navigate('/me')
            }}
          >
            <User className="size-5" aria-hidden="true" />
            {m.wallet_menu_profile()}
          </button>

          <button
            type="button"
            className="flex w-full px-6 py-5 shrink-0 items-center gap-2 text-left text-sm font-normal leading-normal text-white transition-colors hover:bg-[#131516] focus-visible:bg-[#131516] focus-visible:outline-none"
            onClick={() => void copy(address)}
          >
            {copied ? (
              <Check className="size-5 text-[#2BC235]" aria-hidden="true" />
            ) : (
              <Copy className="size-5" aria-hidden="true" />
            )}
            {m.dashboard_copy_address()}
          </button>

          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full px-6 py-5 shrink-0 items-center gap-2 text-left text-sm font-normal leading-normal text-white transition-colors hover:bg-[#131516] focus-visible:bg-[#131516] focus-visible:outline-none"
            >
              <ExternalLink className="size-5" aria-hidden="true" />
              {m.wallet_menu_explorer()}
            </a>
          )}

          <button
            type="button"
            className="flex w-full px-6 pt-5 pb-8 shrink-0 items-center gap-2 text-left text-sm font-normal leading-normal text-[#F7594B] transition-colors hover:bg-[#131516] focus-visible:bg-[#131516] focus-visible:outline-none"
            onClick={() => {
              disconnect()
              close()
            }}
          >
            <LogOut className="size-5" aria-hidden="true" />
            {m.wallet_menu_disconnect()}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
