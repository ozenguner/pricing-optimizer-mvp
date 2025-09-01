import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { authService } from '../services/auth'

export function EmailVerificationPending() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [canResend, setCanResend] = useState(true)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && !canResend) {
      setCanResend(true)
    }
  }, [countdown, canResend])

  const handleResendEmail = async () => {
    if (!email) {
      setError('Email address is required to resend verification email')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      setMessage('')
      
      const result = await authService.resendVerificationEmail(email)
      setMessage('Verification email sent! Please check your inbox and spam folder.')
      setCanResend(false)
      setCountdown(60) // 60 second cooldown
    } catch (err: any) {
      console.error('Resend verification email error:', err)
      
      let errorMessage = 'Failed to resend verification email'
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-4">
            <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-3xl font-extrabold text-secondary-900">
            Verify Your Email Address
          </h2>
          
          <p className="mt-2 text-sm text-secondary-600">
            We've sent a verification email to:
          </p>
          
          <p className="mt-1 text-lg font-medium text-secondary-900">
            {email || 'your email address'}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Check your email inbox
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Click the verification link in the email we sent you. If you don't see it, check your spam or junk folder.</p>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="alert-success">
              {message}
            </div>
          )}

          {error && (
            <div className="alert-error">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-secondary-600 mb-4">
                Didn't receive the email?
              </p>
              
              <button
                onClick={handleResendEmail}
                disabled={isLoading || !canResend}
                className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading 
                  ? 'Sending...' 
                  : !canResend 
                    ? `Resend in ${countdown}s`
                    : 'Resend verification email'
                }
              </button>
            </div>

            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-secondary-600">
                Need help?{' '}
                <a href="mailto:support@ratecardlab.com" className="font-medium text-primary-600 hover:text-primary-500">
                  Contact support
                </a>
              </p>
            </div>

            <div className="text-center">
              <Link 
                to="/login" 
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                ← Back to login
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> The verification link will expire in 24 hours. 
                You cannot access your dashboard until your email is verified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailVerificationPending