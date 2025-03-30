// app/api/auth/login/route.ts - Updated to remove OTP verification
import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    console.log('data', email);
    console.log('data', password);

    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Generate JWT token
    const token = sign(
      { email, userId: user.id },
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
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

// // middleware.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { verify } from 'jsonwebtoken';

// export function middleware(req: NextRequest) {
//   // Exclude auth routes from middleware
//   if (
//     req.nextUrl.pathname.startsWith('/api/auth') ||
//     req.nextUrl.pathname === '/' ||
//     req.nextUrl.pathname.startsWith('/signup') ||
//     req.nextUrl.pathname.startsWith('/login') ||
//     req.nextUrl.pathname.startsWith('/verify')
//   ) {
//     return NextResponse.next();
//   }

//   // Check for auth token
//   const token = req.cookies.get('auth_token')?.value;

//   if (!token) {
//     return NextResponse.redirect(new URL('/login', req.url));
//   }

//   try {
//     // Verify token
//     verify(token, process.env.JWT_SECRET || 'fallback_secret');
//     return NextResponse.next();
//   } catch (error) {
//     // Token invalid or expired
//     return NextResponse.redirect(new URL('/login', req.url));
//   }
// }

// export const config = {
//   matcher: [
//     '/((?!_next/static|_next/image|favicon.ico|public/).*)',
//   ],
// };