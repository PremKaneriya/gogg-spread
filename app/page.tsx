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
    }
    catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Check authentication status and fetch all available spreadsheets
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
    // Check if user is authenticated before allowing to create new
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    
    setSelectedSheet(null);
    setIsCreatingNew(true);
  };

  const handleSelectSheet = (id: string) => {
    // Check if user is authenticated before allowing to select a sheet
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
    fetchSpreadsheets(); // Refresh the list when going back
  };

  const handleLogin = () => {
    router.push("/login");
  };

  // Filter spreadsheets based on search term
  const filteredSpreadsheets = spreadsheets.filter(sheet =>
    (sheet.name || `Spreadsheet ${sheet.id}`).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If not authenticated, show login prompt
  if (!isAuthenticated && !selectedSheet && !isCreatingNew) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Spreadsheets</h1>
          <p className="text-gray-600 mb-6">Please log in to view and manage your spreadsheets.</p>
          <button
            onClick={handleLogin}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg flex items-center justify-center transition-colors shadow-md mx-auto"
          >
            <LogIn size={18} className="mr-2" />
            Login to Your Account
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {!selectedSheet && !isCreatingNew ? (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
              <h1 className="text-3xl font-bold text-gray-800">My Spreadsheets</h1>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0.5 flex items-center pl-3 pointer-events-none">
                    <Search size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search spreadsheets..."
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleCreateNew}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center transition-colors shadow-md"
                >
                  <Plus size={18} className="mr-2" />
                  New Spreadsheet
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center transition-colors shadow-md"
                >
                  <LogIn size={18} className="mr-2" />
                  Logout
                </button>
              </div>
            </div>

            {/* Display any errors */}
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                <p>{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSpreadsheets.length === 0 && searchTerm ? (
                  <div className="col-span-full text-center p-10 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-4">No spreadsheets found matching "{searchTerm}"</p>
                    <button
                      onClick={() => setSearchTerm("")}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg"
                    >
                      Clear search
                    </button>
                  </div>
                ) : filteredSpreadsheets.length === 0 ? (
                  <div className="col-span-full text-center p-10 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-4">No spreadsheets found</p>
                    <button
                      onClick={handleCreateNew}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg"
                    >
                      Create your first spreadsheet
                    </button>
                  </div>
                ) : (
                  filteredSpreadsheets.map((sheet) => (
                    <div
                      key={sheet.id}
                      className="bg-white p-5 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all duration-200 transform hover:-translate-y-1 border border-gray-100"
                      onClick={() => handleSelectSheet(sheet.id)}
                    >
                      <div className="flex items-start">
                        <div className="bg-teal-100 p-3 rounded-lg mr-3">
                          <FileSpreadsheet className="text-teal-600" size={24} />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-semibold text-lg text-gray-800 truncate">{sheet.name || `Spreadsheet ${sheet.id}`}</h3>
                          <p className="text-gray-500 text-sm">
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
          <div className="bg-gray-800 text-white p-3 shadow-md">
            <button
              onClick={handleBackToList}
              className="bg-gray-700 hover:bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center shadow transition-colors"
            >
              <span className="mr-1">←</span> Back to List
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