
// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    
    // Validate input
    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }
    
    // Verify OTP
    const isValid = await verifyOTP(email, otp);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }
    
    // Generate JWT token
    const token = sign(
      { email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );
    
    // Set cookie
    cookies().set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    
    return NextResponse.json({
      message: 'Email verified successfully',
      verified: true,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
