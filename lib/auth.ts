// lib/auth.ts
import { compare, hash } from 'bcrypt';
import crypto from 'crypto';
import pool from './db';

export async function createUser(email: string, password: string) {
  const hashedPassword = await hash(password, 10);
  
  try {
    const result = await pool.query(
      `INSERT INTO spread_users (email, password) 
       VALUES ($1, $2) 
       RETURNING id, email`,
      [email, hashedPassword]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
}

// export async function getUserByEmail(email: string) {
//   try {
//     const result = await pool.query(
//       'SELECT * FROM users WHERE email = $1',
//       [email]
//     );
    
//     return result.rows[0] || null;
//   } catch (error) {
//     console.error('Error fetching user:', error);
//     throw new Error('Failed to fetch user');
//   }
// }

// export async function verifyPassword(providedPassword: string, storedPassword: string) {
//   return compare(providedPassword, storedPassword);
// }

// Add these logs to lib/auth.ts functions
export async function getUserByEmail(email: string) {
  try {
    console.log('Attempting to fetch user for email:', email);
    const result = await pool.query(
      'SELECT * FROM spread_users WHERE email = $1',
      [email]
    );
    console.log('Query result rows:', result.rows);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    throw new Error('Failed to fetch user');
  }
}

export async function verifyPassword(providedPassword: string, storedPassword: string) {
  try {
    console.log('Verifying password');
    const result = await compare(providedPassword, storedPassword);
    console.log('Password verification result:', result);
    return result;
  } catch (error) {
    console.error('Error in verifyPassword:', error);
    throw new Error('Failed to verify password');
  }
}

export async function generateOTP() {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function saveOTP(email: string, otp: string) {
  try {
    // OTP expires in 15 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    await pool.query(
      `INSERT INTO otps (email, otp, expires_at) 
       VALUES ($1, $2, $3)
       ON CONFLICT (email) 
       DO UPDATE SET otp = $2, expires_at = $3`,
      [email, otp, expiresAt]
    );
    
    return true;
  } catch (error) {
    console.error('Error saving OTP:', error);
    throw new Error('Failed to save OTP');
  }
}

export async function verifyOTP(email: string, otp: string) {
  try {
    const result = await pool.query(
      `SELECT * FROM otps 
       WHERE email = $1 AND otp = $2 AND expires_at > NOW()`,
      [email, otp]
    );
    
    if (result.rows.length > 0) {
      // Delete the OTP once verified
      await pool.query('DELETE FROM otps WHERE email = $1', [email]);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw new Error('Failed to verify OTP');
  }
}

// Add this to your @/lib/auth.ts file

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

export async function getUserFromRequest(req: NextRequest) {
  try {
    // Get the auth token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return null;
    }
    
    // Verify and decode the token
    const decoded = verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Return the user information from the token
    return decoded as { email: string, userId: string };
  } catch (error) {
    console.error('Error extracting user from request:', error);
    return null;
  }
}