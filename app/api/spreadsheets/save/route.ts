import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { data } = await req.json();

  try {
    await pool.query("INSERT INTO spreadsheets (data) VALUES ($1)", [JSON.stringify(data)]);
    return NextResponse.json({ message: "Spreadsheet saved successfully" }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error saving data" }, { status: 500 });
  }
}
