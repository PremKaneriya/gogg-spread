// app/api/spreadsheets/save/route.ts
import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth"; // Assuming this function exists to extract user from JWT

export async function POST(req: NextRequest) {
  try {
    // Get user information from the request
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { name, data } = await req.json();

    // Store the sheet data along with the name in the JSON data field
    const sheetData = {
      name: name || "Untitled Spreadsheet",
      content: data
    };
    
    // Include user_id in the insert operation
    const result = await pool.query(
      "INSERT INTO spreadsheets (data, user_id) VALUES ($1, $2) RETURNING id",
      [JSON.stringify(sheetData), user.userId]
    );
    
    return NextResponse.json({
      id: result.rows[0].id,
      message: "Spreadsheet saved successfully"
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error saving data" }, { status: 500 });
  }
}