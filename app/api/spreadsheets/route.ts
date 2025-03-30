// app/api/spreadsheets/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth"; // Assuming this function exists to extract user from JWT

export const dynamic = "force-dynamic"; // <- Disable caching for the route

export async function GET(req: NextRequest) {
  try {
    // Get user information from the request
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Query to fetch all spreadsheets for the specific user
    const result = await pool.query(`
      SELECT id, data, 
      CASE
        WHEN data->>'name' IS NOT NULL THEN data->>'name'
        ELSE 'Untitled Spreadsheet'
      END AS name,
      created_at AS "createdAt"
      FROM spreadsheets
      WHERE user_id = $1
    `, [user.userId]);
    
    return NextResponse.json(result.rows, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error fetching data" }, { status: 500 });
  }
}