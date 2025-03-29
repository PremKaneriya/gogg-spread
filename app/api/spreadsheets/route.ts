// app/api/spreadsheets/route.ts
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    // Modify the query to fetch all spreadsheets instead of just the latest one
    const result = await pool.query(`
      SELECT id, data, 
      CASE 
        WHEN data->>'name' IS NOT NULL THEN data->>'name'
        ELSE 'Untitled Spreadsheet'
      END AS name,
      created_at AS "createdAt"
      FROM spreadsheets 
    `);
    
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