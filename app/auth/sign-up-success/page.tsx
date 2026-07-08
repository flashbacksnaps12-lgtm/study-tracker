'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function SignUpSuccessPage() {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = '/auth/login'
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">Account Created!</h1>
        <p className="text-text-secondary mb-6">Your account has been successfully created.</p>

        <p className="text-text-muted mb-6">Redirecting to login in {countdown} seconds...</p>

        <Link
          href="/auth/login"
          className="inline-block px-6 py-2 bg-accent text-accent-foreground font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Go to Login
        </Link>
      </div>
    </div>
  )
}
