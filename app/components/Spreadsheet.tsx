"use client";
import React, { useRef, useState, useEffect } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { Save, Download, Upload, RefreshCw } from "lucide-react";

interface SpreadsheetProps {
  sheetId: string | null;
  isNew: boolean;
  onSaveComplete?: () => void;
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ sheetId, isNew, onSaveComplete }) => {
  const hotRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sheetName, setSheetName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Generate 100 empty rows for initial data
  const generateEmptyRows = (numRows: number = 100) => {
    // Create header row
    const headers = ["ID", "Name", "Department", "Salary", "Start Date", "Performance Rating"];
    
    // Create sample data for first 3 rows
    const sampleData = [
      [1, "John Doe", "HR", 50000, "2022-01-15", "A"],
      [2, "Jane Smith", "Engineering", 70000, "2021-06-20", "A+"],
      [3, "Mike Johnson", "Sales", 60000, "2023-03-10", "B"],
    ];
    
    // Create remaining empty rows (with ID numbers)
    const emptyRows = Array.from({ length: numRows - 3 }, (_, i) => {
      const rowData = [i + 4, "", "", "", "", ""];
      return rowData;
    });
    
    // Combine header, sample data and empty rows
    return [headers, ...sampleData, ...emptyRows];
  };

  const [data, setData] = useState<any[]>(generateEmptyRows());

  useEffect(() => {
    if (!isNew && sheetId) {
      fetchSheetData(sheetId);
    }
  }, [sheetId, isNew]);

  // Fetch specific sheet data
  const fetchSheetData = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/spreadsheets/${id}`);
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      
      const result = await res.json();
      if (result) {
        // If data has fewer than 100 rows, add empty rows
        let fetchedData = result.data || [];
        if (fetchedData.length < 100) {
          const headers = fetchedData[0] || [];
          const existingDataRows = fetchedData.slice(1) || [];
          const additionalEmptyRows = Array.from(
            { length: 100 - existingDataRows.length }, 
            (_, i) => {
              // Create empty row with ID if the first column is for IDs
              const rowData = Array(headers.length).fill("");
              if (headers[0] === "ID") {
                rowData[0] = existingDataRows.length + i + 1;
              }
              return rowData;
            }
          );
          fetchedData = [headers, ...existingDataRows, ...additionalEmptyRows];
        }
        setData(fetchedData);
        setSheetName(result.name || `Spreadsheet ${id}`);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      alert("Failed to load spreadsheet data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Save Data to API
  const saveData = async () => {
    if (!sheetName.trim()) {
      alert("Please enter a name for your spreadsheet");
      return;
    }

    setIsLoading(true);
    try {
      // Get all data including empty rows
      const tableData = hotRef.current.hotInstance.getData();
      
      const endpoint = isNew 
        ? "/api/spreadsheets/save" 
        : `/api/spreadsheets/save/${sheetId}`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: sheetName,
          data: tableData 
        }),
      });

      if (response.ok) {
        alert(`Spreadsheet ${isNew ? 'created' : 'updated'} successfully!`);
        if (onSaveComplete) onSaveComplete();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Save failed");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      alert(`Failed to save spreadsheet: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!hotRef.current) return;
    
    // Get non-empty rows only for export
    const allData = hotRef.current.hotInstance.getData();
    const nonEmptyRows = allData.filter((row: any[]) => row.some(cell => cell !== "" && cell !== null));
    
    const csvContent = nonEmptyRows.map((row: any) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${sheetName || "spreadsheet"}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV safely
  const parseCSV = (text: string) => {
    const parsedRows = text
      .split("\n")
      .map((row) =>
        row
          .split(",")
          .map((cell) => cell.replace(/^"|"$/g, "").trim())
      )
      .filter((row) => row.length > 0);
    
    // Get header row
    const headers = parsedRows[0] || [];
    
    // Get data rows
    const dataRows = parsedRows.slice(1) || [];
    
    // Add empty rows to fill up to 100 rows
    const emptyRows = Array.from({ length: Math.max(0, 100 - dataRows.length) }, () => {
      return Array(headers.length).fill("");
    });
    
    return [headers, ...dataRows, ...emptyRows];
  };

  // Import CSV with file validation
  const importCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      alert("No file selected!");
      return;
    }

    // Check if it's CSV
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      alert("Invalid file type. Please upload a CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const csvData = parseCSV(text);

        if (csvData.length > 0) {
          setData(csvData);
        } else {
          alert("Empty or invalid CSV file.");
        }
      } catch (error) {
        console.error("Error parsing CSV:", error);
        alert("Failed to parse CSV file.");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header Section */}
      <div className="bg-gray-100 p-4 flex justify-between items-center shadow-md text-gray-800">
        <div className="flex items-center">
          <input
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Enter spreadsheet name"
            className="text-xl font-bold border-2 border-gray-300 rounded px-2 py-1 mr-2 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex space-x-2">
          {!isNew && sheetId && (
            <button
              onClick={() => fetchSheetData(sheetId)}
              disabled={isLoading}
              className="flex items-center bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              <RefreshCw className="mr-2" size={16} />
              Refresh
            </button>
          )}
          {/* Save Button */}
          <button
            onClick={saveData}
            disabled={isLoading}
            className="flex items-center bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            <Save className="mr-2" size={16} />
            Save
          </button>
          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600"
          >
            <Download className="mr-2" size={16} />
            Export CSV
          </button>
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={importCSV}
            accept=".csv"
            className="hidden"
          />
          {/* Import Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center bg-orange-500 text-white px-3 py-2 rounded hover:bg-orange-600"
          >
            <Upload className="mr-2" size={16} />
            Import CSV
          </button>
        </div>
      </div>

      {/* Spreadsheet Section */}
      <div className="flex-grow w-full overflow-hidden">
        <HotTable
          ref={hotRef}
          data={data}
          colHeaders={true}
          rowHeaders={true}
          dropdownMenu={true}
          filters={true}
          contextMenu={true}
          height="100%"
          width="100%"
          stretchH="all"
          columnSorting={true}
          multiColumnSorting={true}
          manualColumnResize={true}
          minRows={100}
          minSpareRows={1}  // Always keeps one empty row at the bottom
          allowInsertRow={true}
          allowInsertColumn={true}
          allowRemoveRow={true}
          allowRemoveColumn={true}
          comments={true}
          licenseKey="non-commercial-and-evaluation"
        />
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default Spreadsheet;