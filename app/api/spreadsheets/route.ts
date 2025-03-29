// app/api/spreadsheets/route.ts
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    // Using parameterized query for better security (though no user inputs here)
    const result = await pool.query(`
      SELECT 
        id, 
        data, 
        CASE 
          WHEN data->>'name' IS NOT NULL AND data->>'name' != '' THEN data->>'name'
          ELSE 'Untitled Spreadsheet'
        END AS name,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM spreadsheets 
      ORDER BY updated_at DESC
    `);
    
    // Add proper cache control headers
    return NextResponse.json(result.rows, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      }
    });
  } catch (error) {
    console.error('Error fetching spreadsheets:', error);
    return NextResponse.json(
      { error: "An error occurred while fetching spreadsheets" }, 
      { status: 500 }
    );
  }
}

// For handling OPTIONS requests (CORS)
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}