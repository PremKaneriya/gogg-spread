// app/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import Spreadsheet from "./components/Spreadsheet";
import { Plus, FileSpreadsheet, Search, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        setIsAuthenticated(false);
        router.push("/login");
      } else {
        throw new Error("Failed to log out");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const fetchSpreadsheets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/spreadsheets", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
      
      if (res.status === 401) {
        setIsAuthenticated(false);
        throw new Error("You need to log in to view your spreadsheets.");
      }
      
      if (!res.ok) {
        throw new Error(`Failed to fetch spreadsheets: ${res.status}`);
      }
      
      const data = await res.json();
      setSpreadsheets(data);
    } catch (error: any) {
      console.error("Failed to fetch spreadsheets:", error);
      setError(error.message || "Failed to load spreadsheets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpreadsheets();
  }, []);

  const handleCreateNew = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setSelectedSheet(null);
    setIsCreatingNew(true);
  };

  const handleSelectSheet = (id: string) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setSelectedSheet(id);
    setIsCreatingNew(false);
  };

  const handleBackToList = () => {
    setSelectedSheet(null);
    setIsCreatingNew(false);
    fetchSpreadsheets();
  };

  const handleLogin = () => {
    router.push("/login");
  };

  const filteredSpreadsheets = spreadsheets.filter(sheet =>
    (sheet.name || `Spreadsheet ${sheet.id}`).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated && !selectedSheet && !isCreatingNew) {
    return (
      <main className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <h1 className="text-3xl font-light text-blue-900">Welcome to Spreadsheets</h1>
          <p className="text-blue-600">Please log in to view and manage your spreadsheets</p>
          <button
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md flex items-center justify-center transition-colors w-full max-w-xs mx-auto"
          >
            <LogIn size={18} className="mr-2" />
            Login to Your Account
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-50">
      {!selectedSheet && !isCreatingNew ? (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h1 className="text-3xl font-light text-blue-900">My Spreadsheets</h1>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
                  <input
                    type="text"
                    placeholder="Search spreadsheets..."
                    className="w-full pl-10 pr-3 py-2 border border-blue-200 rounded-md bg-blue-50 text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleCreateNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center transition-colors"
                >
                  <Plus size={18} className="mr-2" />
                  New Spreadsheet
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center justify-center transition-colors"
                >
                  <LogIn size={18} className="mr-2" />
                  Logout
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                <p>{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSpreadsheets.length === 0 && searchTerm ? (
                  <div className="col-span-full text-center p-10 bg-blue-50 rounded-md">
                    <p className="text-blue-600 mb-4">No spreadsheets found matching "{searchTerm}"</p>
                    <button
                      onClick={() => setSearchTerm("")}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Clear search
                    </button>
                  </div>
                ) : filteredSpreadsheets.length === 0 ? (
                  <div className="col-span-full text-center p-10 bg-blue-50 rounded-md">
                    <p className="text-blue-600 mb-4">No spreadsheets found</p>
                    <button
                      onClick={handleCreateNew}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Create your first spreadsheet
                    </button>
                  </div>
                ) : (
                  filteredSpreadsheets.map((sheet) => (
                    <div
                      key={sheet.id}
                      className="bg-white p-5 rounded-md border border-blue-200 hover:border-blue-300 cursor-pointer transition-all duration-200"
                      onClick={() => handleSelectSheet(sheet.id)}
                    >
                      <div className="flex items-start">
                        <div className="bg-blue-100 p-3 rounded-md mr-3">
                          <FileSpreadsheet className="text-blue-600" size={24} />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-medium text-blue-900 truncate">{sheet.name || `Spreadsheet ${sheet.id}`}</h3>
                          <p className="text-blue-600 text-sm">
                            Last updated: {new Date(sheet.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen">
<div className="bg-gray-100 p-2">
  <button
    onClick={handleBackToList}
    className="text-gray-700 hover:text-gray-900 text-sm flex items-center transition-colors"
  >
    <span className="mr-1">←</span> Back
  </button>
</div>
          <div className="flex-grow overflow-hidden">
            <Spreadsheet 
              sheetId={selectedSheet} 
              isNew={isCreatingNew} 
              onSaveComplete={handleBackToList} 
            />
          </div>
        </div>
      )}
    </main>
  );
}