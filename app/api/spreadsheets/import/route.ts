import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import pool from "@/lib/db";
import { promises as fs } from 'fs';
import { join } from 'path';
import os from 'os';
import crypto from 'crypto';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Get the form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    
    // Create a temporary file
    const tempDir = os.tmpdir();
    const randomFileName = `${crypto.randomBytes(16).toString('hex')}.xlsx`;
    const tempFilePath = join(tempDir, randomFileName);
    
    // Write file to temp location
    const bytes = await file.arrayBuffer();
    await fs.writeFile(tempFilePath, new Uint8Array(bytes));
    
    try {
      // Process the Excel file using file path instead of buffer
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(tempFilePath);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        return NextResponse.json({ error: "Worksheet not found" }, { status: 400 });
      }

      const data: any[] = [];
      worksheet.eachRow((row) => {
        data.push(row.values);
      });

      // Save to database
      await pool.query("INSERT INTO spreadsheets (data) VALUES ($1)", [JSON.stringify(data)]);
      
      return NextResponse.json({ message: "Data imported successfully" }, { status: 201 });
    } finally {
      // Clean up the temporary file
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        console.error("Failed to delete temporary file:", err);
      }
    }
  } catch (error) {
    console.error("Error importing spreadsheet:", error);
    return NextResponse.json({ error: "Error importing data" }, { status: 500 });
  }
}