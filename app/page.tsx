"use client";
import React, { useState, useEffect } from "react";
import Spreadsheet from "./components/Spreadsheet";
import { Plus, FileSpreadsheet } from "lucide-react";

export default function Home() {
  const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Fetch all available spreadsheets
  const fetchSpreadsheets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spreadsheets");
      const data = await res.json();
      setSpreadsheets(data);
    } catch (error) {
      console.error("Failed to fetch spreadsheets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpreadsheets();
  }, []);

  const handleCreateNew = () => {
    setSelectedSheet(null);
    setIsCreatingNew(true);
  };

  const handleSelectSheet = (id: string) => {
    setSelectedSheet(id);
    setIsCreatingNew(false);
  };

  const handleBackToList = () => {
    setSelectedSheet(null);
    setIsCreatingNew(false);
    fetchSpreadsheets(); // Refresh the list when going back
  };

  return (
    <main className="min-h-screen bg-gray-100">
      {!selectedSheet && !isCreatingNew ? (
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">My Spreadsheets</h1>
            <button
              onClick={handleCreateNew}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus size={18} className="mr-2" />
              New Spreadsheet
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {spreadsheets.length === 0 ? (
                <div className="col-span-full text-center p-10 bg-white rounded-lg shadow">
                  <p className="text-gray-500 mb-4">No spreadsheets found</p>
                  <button
                    onClick={handleCreateNew}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                  >
                    Create your first spreadsheet
                  </button>
                </div>
              ) : (
                spreadsheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className="bg-white p-4 rounded-lg shadow hover:shadow-md cursor-pointer transition-shadow"
                    onClick={() => handleSelectSheet(sheet.id)}
                  >
                    <div className="flex items-center">
                      <FileSpreadsheet className="text-blue-500 mr-3" size={24} />
                      <div>
                        <h3 className="font-semibold text-lg text-gray-800">{sheet.name || `Spreadsheet ${sheet.id}`}</h3>
                        <p className="text-gray-500 text-sm">
                          Last updated: {new Date(sheet.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="bg-gray-200 p-4">
            <button
              onClick={handleBackToList}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
            >
              ← Back to List
            </button>
          </div>
          <Spreadsheet 
            sheetId={selectedSheet} 
            isNew={isCreatingNew} 
            onSaveComplete={handleBackToList} 
          />
        </div>
      )}
    </main>
  );
}