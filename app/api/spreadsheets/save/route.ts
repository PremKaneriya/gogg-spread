// app/api/spreadsheets/save/route.ts
import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { name, data } = await req.json();

  try {
    // Store the sheet data along with the name in the JSON data field
    const sheetData = {
      name: name || "Untitled Spreadsheet",
      content: data
    };
    
    const result = await pool.query(
      "INSERT INTO spreadsheets (data) VALUES ($1) RETURNING id", 
      [JSON.stringify(sheetData)]
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