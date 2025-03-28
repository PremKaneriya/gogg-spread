import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await pool.query("SELECT * FROM spreadsheets WHERE id = $1", [params.id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Spreadsheet not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error fetching data" }, { status: 500 });
  }
}
