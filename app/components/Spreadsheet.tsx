"use client";
import React, { useRef, useState, useEffect } from "react";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { Save, Download, Upload, RefreshCw, Settings, AlertTriangle, X, HelpCircle, PlusCircle, Menu } from "lucide-react";

interface SpreadsheetProps {
  sheetId: string | null;
  isNew: boolean;
  onSaveComplete?: () => void;
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ sheetId, isNew, onSaveComplete }) => {
  const hotRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sheetName, setSheetName] = useState<string>("Untitled Spreadsheet");
  const [data, setData] = useState<any[]>(Array(100).fill(null).map(() => Array(26).fill("")));
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewportHeight = () => setViewportHeight(window.innerHeight);
    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    return () => window.removeEventListener('resize', updateViewportHeight);
  }, []);

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
      if (result && result.data) {
        const fetchedData = padDataToGrid(result.data, rowCount, 26);
        setData(fetchedData);
        setSheetName(result.name || `Spreadsheet ${id}`);
        if (hotRef.current?.hotInstance) {
          hotRef.current.hotInstance.loadData(fetchedData);
        }
        showToastMessage("Spreadsheet loaded successfully");
      }
    } catch (error: any) {
      setError(error.message || "Failed to load spreadsheet data");
      showToastMessage("Failed to load spreadsheet data", "error");
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
      if (!hotRef.current?.hotInstance) throw new Error("Spreadsheet not initialized");
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
        throw new Error("Save failed");
      }
    } catch (error: any) {
      setError(error.message || "Failed to save spreadsheet");
      showToastMessage(`Failed to save spreadsheet: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const padDataToGrid = (inputData: any[], targetRows: number, targetCols: number) => {
    const paddedData = Array(targetRows).fill(null).map(() => Array(targetCols).fill(""));
    for (let i = 0; i < Math.min(inputData.length, targetRows); i++) {
      for (let j = 0; j < Math.min(inputData[i]?.length || 0, targetCols); j++) {
        paddedData[i][j] = inputData[i][j] ?? "";
      }
    }
    return paddedData;
  };

  const exportToCSV = () => {
    if (!hotRef.current?.hotInstance) return;
    const tableData = hotRef.current.hotInstance.getData();
    const csvContent = tableData.map((row: any) =>
      row.map((cell: any) => (cell !== null && cell !== undefined ? `"${cell}"` : "")).join(",")
    ).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${sheetName || "spreadsheet"}_export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMessage("CSV exported successfully");
    setShowSettings(false);
  };

  const importCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const csvData = text.split("\n").map(row => row.split(",").map(cell => cell.replace(/^"|"$/g, "").trim()));
      const newRowCount = Math.max(rowCount, csvData.length);
      setRowCount(newRowCount);
      const paddedData = padDataToGrid(csvData, newRowCount, 26);
      setData(paddedData);
      if (hotRef.current?.hotInstance) {
        hotRef.current.hotInstance.loadData(paddedData);
      }
      showToastMessage("CSV imported successfully");
      setShowSettings(false);
    };
    reader.readAsText(file);
  };

  const addMoreRows = () => {
    const newRowCount = rowCount + addRowsCount;
    const newRows = Array(addRowsCount).fill(null).map(() => Array(26).fill(""));
    const newData = [...data, ...newRows];
    setRowCount(newRowCount);
    setData(newData);
    if (hotRef.current?.hotInstance) {
      hotRef.current.hotInstance.loadData(newData);
    }
    showToastMessage(`Added ${addRowsCount} rows. Total rows: ${newRowCount}`);
    setShowAddRowsModal(false);
  };

  const handleAddRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) setAddRowsCount(value);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const hotSettings = {
    data,
    colHeaders: true,
    rowHeaders: true,
    dropdownMenu: true,
    filters: true,
    contextMenu: true,
    height: viewportHeight ? `${viewportHeight - 120}px` : "500px",
    width: "100%",
    stretchH: "all" as const,
    columnSorting: true,
    manualColumnResize: true,
    manualRowResize: true,
    licenseKey: "non-commercial-and-evaluation",
    minRows: rowCount,
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center text-red-600 mb-4">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <span className="text-lg">Authentication Required</span>
          </div>
          <button
            onClick={() => window.location.href = "/login"}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-gray-700">
      <div className="bg-white shadow-md p-3 sticky top-0 z-20">
        <div className="container mx-auto flex items-center justify-between">
          <input
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Enter spreadsheet name"
            className="w-72 px-4 py-2 border rounded-lg"
          />
          <div className="flex gap-3">
            {!isNew && sheetId && (
              <button onClick={() => fetchSheetData(sheetId)} disabled={isLoading} className="flex items-center bg-gray-100 px-4 py-2 rounded-lg text-gray-700">
                <RefreshCw size={16} className="mr-2" /> Refresh
              </button>
            )}
            <button onClick={saveData} disabled={isLoading} className="flex items-center bg-blue-500 text-gray-700 px-4 py-2 rounded-lg">
              <Save size={16} className="mr-2" /> Save
            </button>
            <button onClick={() => setShowSettings(true)} className="flex items-center text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
              <Settings size={16} className="mr-2" /> Tools
            </button>
            <button onClick={() => setShowAddRowsModal(true)} className="flex items-center text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
              <PlusCircle size={16} className="mr-2" /> Add Rows
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 text-white p-3">
          <AlertTriangle className="h-5 w-5 inline mr-2" /> {error}
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl text-gray-700">Spreadsheet Tools</h3>
              <button onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>
            <button onClick={exportToCSV} className="w-full flex items-center bg-gray-100 p-3 rounded-lg mb-3">
              <Download size={18} className="mr-2 text-gray-700" /> Export as CSV
            </button>
            <input type="file" ref={fileInputRef} onChange={importCSV} accept=".csv" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center bg-gray-100 p-3 rounded-lg">
              <Upload size={18} className="mr-2 text-gray-700" /> Import CSV
            </button>
          </div>
        </div>
      )}

      {showAddRowsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-sm">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl text-gray-700">Add Rows</h3>
              <button onClick={() => setShowAddRowsModal(false)}><X size={20} /></button>
            </div>
            <input
              type="number"
              min="1"
              value={addRowsCount}
              onChange={handleAddRowsChange}
              className="w-full p-3 border rounded-lg mb-4 text-gray-700"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAddRowsModal(false)} className="flex-1 bg-gray-100 p-3 rounded-lg text-gray-700">Cancel</button>
              <button onClick={addMoreRows} className="flex-1 bg-blue-500 text-gray-700 p-3 rounded-lg">Add Rows</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow p-4">
        <HotTable ref={hotRef} {...hotSettings} />
      </div>

      {showToast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg ${toastType === "success" ? "bg-green-500" : "bg-red-500"} text-white`}>
          {toastMessage}
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default Spreadsheet;