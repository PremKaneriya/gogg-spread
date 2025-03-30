// app/api/spreadsheets/save/[id]/route.ts
import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth"; // Assuming this function exists to extract user from JWT

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user information from the request
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { name, data } = await req.json();
    const id = params.id;

    // First check if the spreadsheet belongs to the user
    const checkResult = await pool.query(
      "SELECT id FROM spreadsheets WHERE id = $1 AND user_id = $2",
      [id, user.userId]
    );
    
    if (checkResult.rowCount === 0) {
      return NextResponse.json({ error: "Spreadsheet not found or unauthorized" }, { status: 404 });
    }

    // Store the sheet data along with the name in the JSON data field
    const sheetData = {
      name: name || "Untitled Spreadsheet",
      content: data
    };
    
    const result = await pool.query(
      "UPDATE spreadsheets SET data = $1 WHERE id = $2 AND user_id = $3 RETURNING id",
      [JSON.stringify(sheetData), id, user.userId]
    );
    
    return NextResponse.json({
      id: result.rows[0].id,
      message: "Spreadsheet updated successfully"
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error updating data" }, { status: 500 });
  }
}