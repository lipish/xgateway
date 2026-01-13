import React from "react"

interface PageLoadingProps {
  className?: string
  fullScreen?: boolean
}

export function PageLoading({ className, fullScreen }: PageLoadingProps) {
  return (
    <div
      className={
        (fullScreen ? "min-h-screen" : "min-h-[240px]") +
        " flex items-center justify-center " +
        (className || "")
      }
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
