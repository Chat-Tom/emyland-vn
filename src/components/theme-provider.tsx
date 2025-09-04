"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
// Giữ nguyên kiểu props đang dùng
import { ThemeProviderProps } from "next-themes/dist/types"

type Theme = "dark" | "light" | "system"

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  value: _value,
  // nhận đủ props nhưng KHÔNG truyền xuống Provider (Provider chỉ nhận 'value' & 'children')
  ...props
}: ThemeProviderProps) {
  // -- an toàn SSR & tránh "invalid hook call" khi bundle/react trùng bản --
  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined"

  const [theme, setTheme] = useState<Theme>(() => {
    if (isBrowser) {
      try {
        const savedTheme = localStorage.getItem("theme")
        return (savedTheme &&
          (savedTheme === "dark" || savedTheme === "light" || savedTheme === "system")
          ? savedTheme
          : defaultTheme) as Theme
      } catch {
        return defaultTheme as Theme
      }
    }
    return defaultTheme as Theme
  })

  // áp dụng lớp theme lên <html>
  useEffect(() => {
    if (!isBrowser) return
    const root = document.documentElement
    root.classList.remove("light", "dark")

    const apply = (t: Theme) => {
      if (t === "system") {
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        root.classList.add(systemDark ? "dark" : "light")
      } else {
        root.classList.add(t)
      }
    }

    apply(theme)

    // cập nhật theo hệ thống khi chọn "system"
    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)")
      const onChange = () => apply("system")
      try {
        mql.addEventListener?.("change", onChange)
      } catch {
        // Safari cũ
        // @ts-ignore
        mql.addListener?.(onChange)
      }
      return () => {
        try {
          mql.removeEventListener?.("change", onChange)
        } catch {
          // @ts-ignore
          mql.removeListener?.(onChange)
        }
      }
    }
  }, [theme, isBrowser])

  const value: ThemeContextType = useMemo(() => ({
    theme,
    setTheme: (t: Theme) => {
      try {
        localStorage.setItem("theme", t)
      } catch {}
      setTheme(t)
    },
  }), [theme])

  // Không truyền {...props} vào Provider để tránh lỗi runtime (Provider chỉ nhận 'value' & 'children')
  return (
    <>
      {/* giữ props lại để không "mất" về mặt cấu trúc; gắn vào một thẻ ẩn an toàn */}
      <span hidden data-theme-provider-props={JSON.stringify(props ?? {})} />
      <ThemeContext.Provider value={value}>
        {children}
      </ThemeContext.Provider>
    </>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
