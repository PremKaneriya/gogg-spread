import { NextRequest, NextResponse } from "next/server";
import multer from "multer";
import ExcelJS from "exceljs";
import pool from "@/lib/db";

// Multer configuration for file handling
const upload = multer({ storage: multer.memoryStorage() });

export async function POST(req: any) {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, {} as any, async (err: any) => {
      if (err) {
        return resolve(
          NextResponse.json({ error: "Error uploading file" }, { status: 500 })
        );
      }

      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
          throw new Error("Worksheet not found");
        }

        const data: any[] = [];
        worksheet.eachRow((row) => {
          data.push(row.values);
        });

        await pool.query("INSERT INTO spreadsheets (data) VALUES ($1)", [JSON.stringify(data)]);
        resolve(NextResponse.json({ message: "Data imported successfully" }, { status: 201 }));
      } catch (error) {
        console.error(error);
        resolve(
          NextResponse.json({ error: "Error importing data" }, { status: 500 })
        );
      }
    });
  });
}
