import { useEffect, useState } from 'react'
import boardBanner from '@/assets/images/board-banner.png'
import { m } from '@/paraglide/messages.js'
import { cn } from '@/lib/utils'

const SLIDES = [boardBanner, boardBanner]
const AUTO_PLAY_INTERVAL_MS = 5000

export const Banner = () => {
  const [activeIndex, setActiveIndex] = useState(0)

  // Re-created whenever the index changes, so a manual switch restarts the timer.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDES.length)
    }, AUTO_PLAY_INTERVAL_MS)
    return () => window.clearTimeout(timer)
  }, [activeIndex])

  return (
    <div className="relative border border-[#484B51] bg-[#171717] h-35.5 w-full overflow-hidden">
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {SLIDES.map((src, index) => (
          <a
            key={index}
            href=""
            target="_blank"
            rel="noopener noreferrer"
            aria-hidden={index !== activeIndex}
            tabIndex={index === activeIndex ? 0 : -1}
            className="relative h-full w-full shrink-0"
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </a>
        ))}
      </div>
      <div className="flex h-2 items-center justify-center gap-1.25 absolute bottom-2 left-1/2 -translate-x-1/2">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={m.board_banner_slide({ index: index + 1 })}
            aria-current={index === activeIndex}
            onClick={() => setActiveIndex(index)}
            className="grid place-items-center transition-colors h-2 w-2 focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className={cn(
                'block h-2 w-2 border border-[#484B51]',
                index === activeIndex && 'bg-white border-none',
              )}
            ></span>
          </button>
        ))}
      </div>
    </div>
  )
}
