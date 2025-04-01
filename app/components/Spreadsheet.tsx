"use client";
import React, { useRef, useState, useEffect } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { Save, Download, Upload, RefreshCw, Settings, AlertTriangle, X, HelpCircle, PlusCircle } from "lucide-react";

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
  const [rowCount, setRowCount] = useState(100);
  const [addRowsCount, setAddRowsCount] = useState(50);
  const [showAddRowsModal, setShowAddRowsModal] = useState(false);

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
        const fetchedData = result.data || Array(rowCount).fill(null).map(() => Array(26).fill(""));
        setData(padDataToGrid(fetchedData, rowCount, 26));
        setSheetName(result.name || `Spreadsheet ${id}`);
        showToastMessage("Spreadsheet loaded successfully");
      }
    } catch (error: any) {
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
        showToastMessage(`Spreadsheet ${isNew ? 'created' : 'updated'} successfully!`);
        if (onSaveComplete) onSaveComplete();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Save failed");
      }
    } catch (error: any) {
      setError(error.message || "Failed to save spreadsheet");
      showToastMessage(`Failed to save spreadsheet: ${error.message || "Unknown error"}`, "error");
      if (!isAuthenticated) {
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
      const fullData = padDataToGrid(tableData, rowCount, 26);
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
          const newRowCount = Math.max(rowCount, csvData.length);
          setRowCount(newRowCount);
          const paddedData = padDataToGrid(csvData, newRowCount, 26);
          setData(paddedData);
          showToastMessage("CSV imported successfully");
          setShowSettings(false);
        } else {
          showToastMessage("Empty or invalid CSV file.", "error");
        }
      } catch (error) {
        showToastMessage("Failed to parse CSV file.", "error");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const addMoreRows = () => {
    if (!hotRef.current) return;
    try {
      const currentData = hotRef.current.hotInstance.getData();
      const newRowCount = rowCount + addRowsCount;
      const paddedData = padDataToGrid(currentData, newRowCount, 26);
      setRowCount(newRowCount);
      setData(paddedData);
      hotRef.current.hotInstance.loadData(paddedData);
      showToastMessage(`Added ${addRowsCount} rows. Total rows: ${newRowCount}`);
      setShowAddRowsModal(false);
    } catch (error) {
      showToastMessage("Failed to add rows", "error");
    }
  };

  const handleAddRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setAddRowsCount(value);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md border border-gray-200 shadow-lg">
          <div className="flex items-center text-red-600 mb-4">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <span className="text-lg font-medium">Authentication Required</span>
          </div>
          <p className="text-gray-700 mb-6">Please log in to access your spreadsheet.</p>
          <button
            onClick={() => window.location.href = "/login"}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      {/* Floating Header */}
      <div className="sticky top-0 z-20 bg-white shadow-md p-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Enter spreadsheet name"
              className="w-full px-4 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-end w-full sm:w-auto">
            {!isNew && sheetId && (
              <button
                onClick={() => fetchSheetData(sheetId)}
                disabled={isLoading}
                className="flex items-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 transition-all"
              >
                <RefreshCw className="mr-2" size={16} />
                <span>Refresh</span>
              </button>
            )}
            <button
              onClick={saveData}
              disabled={isLoading}
              className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-all"
            >
              <Save className="mr-2" size={16} />
              <span>Save</span>
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all"
            >
              <Settings className="mr-2" size={16} />
              <span>Tools</span>
            </button>
            <button
              onClick={() => setShowAddRowsModal(true)}
              className="flex items-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all"
            >
              <PlusCircle className="mr-2" size={16} />
              <span>Add Rows</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500 text-white p-4 animate-slide-down">
          <div className="container mx-auto flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg border border-gray-200 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-800">Spreadsheet Tools</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <h4 className="font-medium text-gray-700 mb-3">File Operations</h4>
                <div className="space-y-3">
                  <button
                    onClick={exportToCSV}
                    className="w-full flex items-center bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-all"
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
                    className="w-full flex items-center bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    <Upload className="mr-2" size={18} />
                    Import CSV
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setShowSettings(false); setShowHelp(true); }}
                className="w-full flex items-center bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-all"
              >
                <HelpCircle className="mr-2" size={18} />
                Help & Documentation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rows Modal */}
      {showAddRowsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm border border-gray-200 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-800">Add Rows</h3>
              <button onClick={() => setShowAddRowsModal(false)} className="text-gray-500 hover:text-gray-700 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="mb-4">
                <label htmlFor="rowCount" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of rows to add:
                </label>
                <input
                  id="rowCount"
                  type="number"
                  min="1"
                  value={addRowsCount}
                  onChange={handleAddRowsChange}
                  className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddRowsModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={addMoreRows}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all"
                >
                  Add Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-gray-200 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-800">Spreadsheet Guide</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-500 hover:text-gray-700 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6 text-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Basic Operations</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Click cells to edit</li>
                  <li>Tab to navigate</li>
                  <li>Right-click for options</li>
                  <li>Select headers for rows/columns</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Saving</h4>
                <p>Hit "Save" in the toolbar. Name your sheet first!</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Rows</h4>
                <p>Add rows via the "Add Rows" button in the toolbar.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Import/Export</h4>
                <p>Use "Tools" for CSV operations.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet */}
      <div className="flex-grow w-full overflow-auto px-2 sm:px-4 lg:px-6">
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
          autoColumnSize={true}
          licenseKey="non-commercial-and-evaluation"
          className="spreadsheet-theme"
        />
      </div>

      {/* Toast */}
      {showToast && (
        <div className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 max-w-xs sm:max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 transform ${
          toastType === "success" 
            ? "bg-green-500 text-white" 
            : "bg-red-500 text-white"
        } animate-bounce-in`}>
          <div className="flex items-center">
            {toastType === "success" ? (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <AlertTriangle className="w-5 h-5 mr-2" />
            )}
            <p className="text-sm">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid mb-4"></div>
            <p className="text-gray-700 font-medium text-lg">Processing...</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        .handsontable .htCore th {
          background: #f1f5f9 !important;
          color: #334155 !important;
          font-weight: 500 !important;
          border-bottom: 2px solid #cbd5e1 !important;
        }
        .handsontable .htCore tbody tr th {
          background: #f1f5f9 !important;
          color: #334155 !important;
        }
        .handsontable .htCore span.colHeader {
          color: #334155 !important;
        }
        .handsontable .htCore tbody tr:nth-child(even) td {
          background-color: #f8fafc !important;
        }
        .handsontable .htCore tbody td.current,
        .handsontable .htCore tbody td.area {
          background-color: rgba(59, 130, 246, 0.1) !important;
          border: 1px dashed #3B82F6 !important;
        }
        .handsontable .htCore td {
          border-color: #e2e8f0 !important;
          transition: background-color 0.2s ease;
        }
        @media (max-width: 640px) {
          .handsontable .htCore th {
            font-size: 12px !important;
            padding: 4px !important;
          }
          .handsontable .htCore td {
            font-size: 12px !important;
            padding: 4px !important;
          }
        }

        /* Custom Animations */
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.3s ease-in; }
        .animate-bounce-in { animation: bounce-in 0.5s ease-out; }
      `}</style>
    </div>
  );
};

export default Spreadsheet;