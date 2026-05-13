"use client"

import { Toaster } from "react-hot-toast"

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      gutter={10}
      toastOptions={{
        duration: 2500,
        style: {
          background: "var(--bg-surface)",
          color: "var(--text-primary)",
          border: "0.5px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        },
      }}
    />
  )
}
