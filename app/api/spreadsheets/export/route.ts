import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(req: NextRequest) {
  const { data } = await req.json();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data");

  data.forEach((row: any) => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Disposition": "attachment; filename=data.xlsx",
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
