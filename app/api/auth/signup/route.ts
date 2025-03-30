// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUser, generateOTP, getUserByEmail, saveOTP } from '@/lib/auth';
import { sendEmail, generateOTPEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Create user
    const user = await createUser(email, password);
    
    // Generate and save OTP
    const otp = await generateOTP();
    await saveOTP(email, otp);
    
    // Send OTP via email
    await sendEmail({
      to: email,
      subject: 'Verify your email',
      html: generateOTPEmail(otp),
    });
    
    return NextResponse.json({
      message: 'User created successfully. Please verify your email.',
      userId: user.id,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}

