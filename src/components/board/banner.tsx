import boardBanner from '@/assets/images/board-banner.png'

export const Banner = () => {
  return (
    <div className="relative border border-[#484B51] bg-[#171717] h-35.5 w-full overflow-hidden">
      <a
        href=""
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0"
      >
        <img
          src={boardBanner}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="object-cover transition-transform duration-500"
        />
      </a>
      <div className="flex h-2 items-center justify-center gap-1.25 absolute bottom-2 left-1/2 -translate-x-1/2">
        <button
          type="button"
          aria-label="轮播图 1"
          className="grid place-items-center transition-colors h-2 w-2"
        >
          <span
            aria-hidden="true"
            className="block h-2 w-2 border border-[#484B51]"
          ></span>
        </button>
        <button
          type="button"
          aria-label="轮播图 2"
          className="grid place-items-center transition-colors h-2 w-2"
        >
          <span aria-hidden="true" className="block h-2 w-2 bg-white"></span>
        </button>
      </div>
    </div>
  )
}
