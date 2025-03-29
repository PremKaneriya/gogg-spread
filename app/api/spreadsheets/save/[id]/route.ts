// app/api/spreadsheets/save/[id]/route.ts
import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { name, data } = await req.json();
  const id = params.id;

  try {
    // Store the sheet data along with the name in the JSON data field
    const sheetData = {
      name: name || "Untitled Spreadsheet",
      content: data
    };
    
    const result = await pool.query(
      "UPDATE spreadsheets SET data = $1 WHERE id = $2 RETURNING id", 
      [JSON.stringify(sheetData), id]
    );
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Spreadsheet not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      id: result.rows[0].id,
      message: "Spreadsheet updated successfully" 
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error updating data" }, { status: 500 });
  }
}