"use client";
import React, { useRef, useState, useEffect } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { Save, Download, Upload, RefreshCw, Settings, AlertTriangle, X, HelpCircle } from "lucide-react";

interface SpreadsheetProps {
  sheetId: string | null;
  isNew: boolean;
  onSaveComplete?: () => void;
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ sheetId, isNew, onSaveComplete }) => {
  const hotRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sheetName, setSheetName] = useState<string>("Untitled Spreadsheet");
  const [data, setData] = useState<any[]>(() => {
    const rows = 100;
    const cols = 26;
    return Array(rows).fill(null).map(() => Array(cols).fill(""));
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    if (!isNew && sheetId) {
      fetchSheetData(sheetId);
    }
  }, [sheetId, isNew]);

  const showToastMessage = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const fetchSheetData = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/spreadsheets/${id}`);
      if (res.status === 401) {
        setIsAuthenticated(false);
        throw new Error("You are not authorized to access this spreadsheet. Please log in.");
      }
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const result = await res.json();
      if (result) {
        const fetchedData = result.data || Array(100).fill(null).map(() => Array(26).fill(""));
        setData(padDataToGrid(fetchedData, 100, 26));
        setSheetName(result.name || `Spreadsheet ${id}`);
        showToastMessage("Spreadsheet loaded successfully");
      }
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      setError(error.message || "Failed to load spreadsheet data");
      showToastMessage("Failed to load spreadsheet data", "error");
      if (!isAuthenticated) {
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async () => {
    if (!sheetName.trim()) {
      showToastMessage("Please enter a name for your spreadsheet", "error");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const tableData = hotRef.current.hotInstance.getData();
      const endpoint = isNew ? "/api/spreadsheets/save" : `/api/spreadsheets/save/${sheetId}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sheetName, data: tableData }),
      });
      if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error("You are not authorized to save this spreadsheet. Please log in.");
      }
      if (response.ok) {
        const result = await response.json();
        showToastMessage(`Spreadsheet ${isNew ? 'created' : 'updated'} successfully!`);
        if (onSaveComplete) onSaveComplete();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Save failed");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      setError(error.message || "Failed to save spreadsheet");
      showToastMessage(`Failed to save spreadsheet: ${error.message || "Unknown error"}`, "error");
      if (!isAuthenticated) {
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Utility function to pad data to the desired grid size
  const padDataToGrid = (inputData: any[], targetRows: number, targetCols: number) => {
    const paddedData = Array(targetRows).fill(null).map(() => Array(targetCols).fill(""));
    for (let i = 0; i < Math.min(inputData.length, targetRows); i++) {
      for (let j = 0; j < Math.min(inputData[i].length, targetCols); j++) {
        paddedData[i][j] = inputData[i][j] || "";
      }
    }
    return paddedData;
  };

  const exportToCSV = () => {
    if (!hotRef.current) return;
    try {
      const tableData = hotRef.current.hotInstance.getData();
      // Ensure the exported data is padded to 100x26
      const fullData = padDataToGrid(tableData, 100, 26);
      const csvContent = fullData.map((row: any) => row.map((cell: any) => `"${cell}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${sheetName || "spreadsheet"}_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToastMessage("CSV exported successfully");
      setShowSettings(false);
    } catch (error) {
      console.error("Export error:", error);
      showToastMessage("Failed to export CSV", "error");
    }
  };

  const parseCSV = (text: string) => {
    const rows = text.split("\n").map(row =>
      row.split(",").map(cell => cell.replace(/^"|"$/g, "").trim())
    ).filter(row => row.length > 0 && row.some(cell => cell !== ""));
    return rows;
  };

  const importCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      showToastMessage("No file selected!", "error");
      return;
    }
    if (file.type !== "text/csv") {
      showToastMessage("Invalid file type. Please upload a CSV file.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const csvData = parseCSV(text);
        if (csvData.length > 0) {
          // Pad the imported data to fit the 100x26 grid
          const paddedData = padDataToGrid(csvData, 100, 26);
          setData(paddedData);
          showToastMessage("CSV imported successfully");
          setShowSettings(false);
        } else {
          showToastMessage("Empty or invalid CSV file.", "error");
        }
      } catch (error) {
        console.error("Error parsing CSV:", error);
        showToastMessage("Failed to parse CSV file.", "error");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 w-full max-w-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>You need to be logged in to access this spreadsheet.</span>
          </div>
        </div>
        <button
          onClick={() => window.location.href = "/login"}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-50">
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-4 shadow-lg">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center w-full sm:w-auto">
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Enter spreadsheet name"
              className="text-xl text-gray-900 font-bold border-2 border-gray-300 rounded-lg px-3 py-2 w-full sm:w-64 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>
          <div className="flex items-center justify-center gap-2 w-full sm:w-auto flex-wrap">
            {!isNew && sheetId && (
              <button
                onClick={() => fetchSheetData(sheetId)}
                disabled={isLoading}
                className="flex items-center bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-md"
              >
                <RefreshCw className="mr-2" size={16} />
                <span>Refresh</span>
              </button>
            )}
            <button
              onClick={saveData}
              disabled={isLoading}
              className="flex items-center bg-teal-600 text-white px-3 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-md"
            >
              <Save className="mr-2" size={16} />
              <span>Save</span>
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-md"
            >
              <Settings className="mr-2" size={16} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h4 className="font-medium text-gray-700 mb-2">File Operations</h4>
                <div className="space-y-2">
                  <button
                    onClick={exportToCSV}
                    className="flex items-center w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download className="mr-2" size={18} />
                    Export as CSV
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={importCSV}
                    accept=".csv"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Upload className="mr-2" size={18} />
                    Import CSV
                  </button>
                </div>
              </div>
              <div>
                <button
                  onClick={() => { setShowSettings(false); setShowHelp(true); }}
                  className="flex items-center w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                >
                  <HelpCircle className="mr-2" size={18} />
                  Help & Documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Spreadsheet Help</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 text-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Basic Operations</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Click on a cell to edit its content</li>
                  <li>Use tab key to navigate between cells</li>
                  <li>Right-click on cells for additional options</li>
                  <li>Click on column or row headers to select entire columns/rows</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Saving Your Work</h4>
                <p>Click the "Save" button in the top toolbar to save your spreadsheet. Make sure to give your spreadsheet a name before saving.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Importing & Exporting</h4>
                <p>Access import and export options from the Settings menu:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Export as CSV: Save your spreadsheet to a CSV file on your computer</li>
                  <li>Import CSV: Load data from a CSV file into your spreadsheet</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow w-full overflow-auto">
        <HotTable
          ref={hotRef}
          data={data}
          colHeaders={true}
          rowHeaders={true}
          dropdownMenu={true}
          filters={true}
          contextMenu={true}
          height="calc(100vh - 120px)"
          width="100%"
          stretchH="all"
          columnSorting={true}
          multiColumnSorting={true}
          manualColumnResize={true}
          manualRowResize={true}
          autoRowSize={false}
          autoColumnSize={false}
          licenseKey="non-commercial-and-evaluation"
          className="spreadsheet-theme"
        />
      </div>

      {showToast && (
        <div className={`fixed bottom-4 right-4 max-w-sm p-4 rounded-lg shadow-lg transition-opacity duration-300 ${
          toastType === "success" ? "bg-teal-600 text-white" : "bg-red-600 text-white"
        }`}>
          <div className="flex items-center">
            {toastType === "success" ? (
              <svg className="w-6 h-6 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M5 13l4 4L19 7"></path>
              </svg>
            ) : (
              <svg className="w-6 h-6 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            )}
            <p>{toastMessage}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-600 mb-4"></div>
            <p className="text-gray-800 font-medium">Processing...</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        .handsontable .htCore th {
          background-color: #374151 !important;
          color: white !important;
          font-weight: bold !important;
        }
        .handsontable .htCore tbody tr th {
          background-color: #374151 !important;
          color: white !important;
        }
        .handsontable .htCore span.colHeader {
          color: white !important;
        }
        .handsontable .htCore tbody tr:nth-child(even) td {
          background-color: #f9fafb !important;
        }
        .handsontable .htCore tbody td.current,
        .handsontable .htCore tbody td.area {
          background-color: rgba(45, 212, 191, 0.2) !important;
        }
        .handsontable .htCore td {
          border-color: #e5e7eb !important;
        }
      `}</style>
    </div>
  );
};

export default Spreadsheet;