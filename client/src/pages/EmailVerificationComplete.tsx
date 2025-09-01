import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/auth'

export function EmailVerificationComplete() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (token) {
      verifyToken()
    } else {
      setError('Invalid verification link. No token provided.')
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (isSuccess && countdown === 0) {
      navigate('/login')
    }
  }, [isSuccess, countdown, navigate])

  const verifyToken = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const result = await authService.verifyEmail(token!)
      
      setIsSuccess(true)
      setUserEmail(result.user?.email || '')
    } catch (err: any) {
      console.error('Email verification error:', err)
      
      let errorMessage = 'Email verification failed'
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

  const handleContinue = () => {
    navigate('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-lg text-secondary-600">Verifying your email...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {isSuccess ? (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-extrabold text-secondary-900">
                Email Verified Successfully!
              </h2>
              
              <p className="mt-2 text-sm text-secondary-600">
                Your email address has been verified:
              </p>
              
              <p className="mt-1 text-lg font-medium text-secondary-900">
                {userEmail}
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-extrabold text-secondary-900">
                Verification Failed
              </h2>
            </>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          {isSuccess ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Welcome to RateCard Lab!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>You can now access your dashboard and start building rate cards. You'll be automatically redirected to login in {countdown} seconds.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-secondary-900">What's Next?</h3>
                <ul className="space-y-2 text-sm text-secondary-600">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-primary-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                    Sign in with your credentials
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-primary-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                    Create your first rate card
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-primary-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                    Explore pricing calculators
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-primary-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                    Import/export pricing data
                  </li>
                </ul>

                <button
                  onClick={handleContinue}
                  className="w-full btn-primary"
                >
                  Continue to Login
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="alert-error">
                {error}
              </div>

              <div className="space-y-4">
                <div className="text-sm text-secondary-600">
                  <p><strong>Common reasons for verification failure:</strong></p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>The verification link has expired (links expire after 24 hours)</li>
                    <li>The link has already been used</li>
                    <li>The link is invalid or corrupted</li>
                  </ul>
                </div>

                <div className="flex space-x-3">
                  <Link
                    to="/verify-email"
                    className="flex-1 btn-secondary text-center"
                  >
                    Request New Link
                  </Link>
                  <Link
                    to="/login"
                    className="flex-1 btn-primary text-center"
                  >
                    Back to Login
                  </Link>
                </div>
              </div>
            </>
          )}

          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-secondary-600">
              Need help?{' '}
              <a href="mailto:support@ratecardlab.com" className="font-medium text-primary-600 hover:text-primary-500">
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailVerificationComplete