import { PageTitle } from '@/components/common/page-title'
import { Copy, Pencil, Share2 } from 'lucide-react'

export const MePage = () => {
  return (
    <div className="h-full pt-6 flex flex-col">
      <PageTitle title="我的主页" />
      <div className="relative bg-transparent mt-4">
        <div aria-hidden>
          <span className="pointer-events-none absolute left-0 top-0 z-10 h-4 w-4 border-l-2 border-t-2 border-[#FE810B]"></span>
          <span className="pointer-events-none absolute right-0 top-0 z-10 h-4 w-4 border-r-2 border-t-2 border-[#FE810B]"></span>
          <span className="pointer-events-none absolute bottom-0 left-0 z-10 h-4 w-4 border-b-2 border-l-2 border-[#FE810B]"></span>
          <span className="pointer-events-none absolute bottom-0 right-0 z-10 h-4 w-4 border-b-2 border-r-2 border-[#FE810B]"></span>
        </div>
        <div className="flex flex-col gap-4 border border-[#484B51] bg-[#070808] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-[#484B51] bg-black"></div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate text-15 font-medium leading-[1.4] text-white">
                  @0xde9f...b3fa
                </span>
              </div>
              <p className="mt-2 line-clamp-2 break-all text-11 leading-[1.4] text-[#84888C]">
                这个人还没有填写简介。
              </p>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px] items-center gap-3">
              <button
                type="button"
                className="flex h-8 min-w-0 items-center justify-center gap-2 border border-[#484B51] px-3 text-13 font-medium text-white transition-colors hover:border-[#D9FF33] hover:text-[#D9FF33]"
              >
                0xde9f...b3fa
                <Copy className="size-4 shrink-0" />
              </button>
              <button
                type="button"
                aria-label="编辑资料"
                className="flex h-8 items-center justify-center gap-2 border border-[#484B51] px-3 text-13 font-medium text-white transition-colors hover:border-[#D9FF33] hover:text-[#D9FF33] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Pencil className="size-4" />
                编辑资料
              </button>
              <button
                type="button"
                aria-label="分享个人主页"
                title="分享个人主页"
                className="flex h-8 w-8 items-center justify-center border border-[#484B51] text-white transition-colors hover:border-[#D9FF33] hover:text-[#D9FF33] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D0FF00]"
              >
                <Share2 className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3">
          <div className="flex min-w-0 flex-col justify-center gap-1 border border-t-0 border-[#484B51] bg-background px-3 [&amp;:not(:first-child)]:border-l-0">
            <span className="truncate text-11 leading-[1.4] text-[#A0A3A7]">
              资产总值
            </span>
            <span className="truncate text-15 font-medium leading-[1.4] text-white">
              $0.49
            </span>
            <span className="inline-flex truncate text-11 leading-[1.4] text-[#2BD67B]">
              <span>+0.00%</span>
              <span className="ml-2 text-[#84888C]">24小时</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1 border border-t-0 border-[#484B51] bg-background px-3 [&amp;:not(:first-child)]:border-l-0">
            <span className="truncate text-11 leading-[1.4] text-[#A0A3A7]">
              持有代币
            </span>
            <span className="truncate text-15 font-medium leading-[1.4] text-white">
              3
            </span>
            <span className="inline-flex truncate text-11 leading-[1.4] text-[#84888C]">
              <span>个代币</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-1 border border-t-0 border-[#484B51] bg-background px-3 [&amp;:not(:first-child)]:border-l-0 min-h-20 py-3">
            <span className="truncate text-11 leading-[1.4] text-[#A0A3A7]">
              创建代币
            </span>
            <span className="truncate text-15 font-medium leading-[1.4] text-white">
              0
            </span>
            <span className="inline-flex truncate text-11 leading-[1.4] text-[#84888C]">
              <span>个代币</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col w-full">
        <div className="grid grid-cols-2 pb-4 pt-5">
          <button
            type="button"
            role="tab"
            aria-selecte={true}
            className="shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-[#D0FF00]"
          >
            资产
          </button>
          <button
            type="button"
            role="tab"
            aria-selecte={false}
            className="shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-[#D0FF00]"
          >
            分红
          </button>
        </div>
      </div>
    </div>
  )
}
