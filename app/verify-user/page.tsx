// app/verify-user/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [email, setEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email') || '';
    setEmail(emailParam);
    
    if (!emailParam) {
      router.push('/login');
    } else {
      startCountdown();
    }
  }, [router]);

  const startCountdown = () => {
    setCanResend(false);
    setCountdown(60);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, resendOtp: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend OTP');
      }

      startCountdown();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-light text-blue-900">Verify Email</h1>
          <p className="mt-2 text-sm text-blue-600">
            Enter the code sent to <strong>{email}</strong>
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 text-sm">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label htmlFor="otp" className="block text-sm text-blue-700">
              Verification Code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-md bg-blue-50 text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter 6-digit code"
              maxLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="text-center text-sm">
          <span className="text-blue-600">Didn't receive the code? </span>
          <button
            onClick={handleResendOtp}
            disabled={!canResend}
            className={`font-medium ${
              canResend
                ? 'text-blue-700 hover:text-blue-900'
                : 'text-blue-400 cursor-not-allowed'
            } transition-colors`}
          >
            {canResend ? 'Resend code' : `Resend in ${countdown}s`}
          </button>
        </div>
      </div>
    </div>
  );
}