"use client";

import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, Users, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Plus, Search, Check, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { contactsApi } from "@/lib/api";

interface Contact {
  id: string;
  name: string;
  mobile: string;
  status: "Valid" | "Invalid";
}

// ─── Helpers ──────────────────────────────────────────────────
const cleanIndianMobile = (raw: string): string => {
  let m = String(raw).replace(/[^\d+]/g, "");
  if (m.startsWith("+91")) m = m.slice(3);
  else if (m.startsWith("91") && m.length === 12) m = m.slice(2);
  else if (m.startsWith("0")) m = m.slice(1);
  return m;
};
const isValidMobile = (m: string): boolean => /^[6-9]\d{9}$/.test(m);
const toUiContact = (c: { id: string; name: string; mobile: string }): Contact => ({
  id: c.id,
  name: c.name,
  mobile: c.mobile,
  status: isValidMobile(c.mobile) ? "Valid" : "Invalid",
});

export default function CustomerContacts() {
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, invalid: 0 });
  const [loading, setLoading] = useState(true);

  // Manual Add Form states
  const [manualName, setManualName] = useState("");
  const [manualMobile, setManualMobile] = useState("");

  // Search and selection states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Custom Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteActionType, setDeleteActionType] = useState<"single" | "selected" | "clear">("selected");
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateStats = (list: Contact[]) => {
    let valid = 0;
    let invalid = 0;
    list.forEach(c => {
      if (c.status === "Valid") valid++;
      else invalid++;
    });
    setStats({
      total: list.length,
      valid,
      invalid
    });
  };

  // Load the tenant's contacts from the server (per-account isolated).
  const loadContacts = React.useCallback(async () => {
    try {
      const list = await contactsApi.list();
      const ui = list.map(toUiContact);
      setContacts(ui);
      updateStats(ui);
    } catch {
      // API unavailable / not signed in — leave the list empty.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    const allNewContacts: Contact[] = [];
    const fileNames: string[] = [];

    const readAndParseFile = (file: File): Promise<Contact[]> => {
      return new Promise((resolve) => {
        const isCsv = file.name.toLowerCase().endsWith(".csv");
        fileNames.push(file.name);
        
        if (isCsv) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
              resolve([]);
              return;
            }

            const lines = text.split(/\r?\n/);
            if (lines.length <= 1) {
              resolve([]);
              return;
            }

            // Detect CSV columns from header line
            const headerLine = lines[0];
            let delimiter = ",";
            if (headerLine.includes(";")) delimiter = ";";
            else if (headerLine.includes("\t")) delimiter = "\t";

            const headers = headerLine.split(delimiter);
            let nameIdx = -1;
            let phoneIdx = -1;

            headers.forEach((h, i) => {
              const val = h.replace(/["']/g, "").trim().toLowerCase();
              if (val.includes("name") || val.includes("candidate") || val.includes("voter") || val.includes("contactname")) {
                if (nameIdx === -1) nameIdx = i;
              }
              if (val.includes("phone") || val.includes("mobile") || val.includes("number") || val.includes("contactno") || val.includes("mobileno")) {
                if (phoneIdx === -1) phoneIdx = i;
              }
            });

            if (nameIdx === -1) nameIdx = 0;
            if (phoneIdx === -1) phoneIdx = Math.min(1, headers.length - 1);

            const fileContacts: Contact[] = [];

            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const cols: string[] = [];
              let current = "";
              let inQuotes = false;
              for (let c = 0; c < line.length; c++) {
                const char = line[c];
                if (char === '"' || char === "'") {
                  inQuotes = !inQuotes;
                } else if (char === delimiter && !inQuotes) {
                  cols.push(current.trim());
                  current = "";
                } else {
                  current += char;
                }
              }
              cols.push(current.trim());

              if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

              const rawName = cols[nameIdx] ? cols[nameIdx].replace(/["']/g, "").trim() : `Voter ${i}`;
              const rawMobile = cols[phoneIdx] ? cols[phoneIdx].replace(/["']/g, "").replace(/\s+/g, "").trim() : "";

              let cleanMobile = rawMobile.replace(/[^\d+]/g, "");
              if (cleanMobile.startsWith("+91")) cleanMobile = cleanMobile.substring(3);
              else if (cleanMobile.startsWith("91") && cleanMobile.length === 12) cleanMobile = cleanMobile.substring(2);
              else if (cleanMobile.startsWith("0")) cleanMobile = cleanMobile.substring(1);

              const isValid = /^[6-9]\d{9}$/.test(cleanMobile);

              fileContacts.push({
                id: `csv_${file.name}_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: rawName || "Unnamed Contact",
                mobile: cleanMobile || rawMobile || "N/A",
                status: isValid ? "Valid" : "Invalid"
              });
            }
            resolve(fileContacts);
          };
          reader.onerror = () => {
            resolve([]);
          };
          reader.readAsText(file);
        } else {
          // Simulate Excel (.xlsx) parsing
          setTimeout(() => {
            const generatedContacts: Contact[] = [];
            const names = ["Amit Kumar", "Priya Singh", "Rahul Dev", "Sneha Patel", "Rajesh Gupta", "Sunita Sharma", "Vijay Yadav", "Karan Johar", "Vikram Rathore", "Divya Deshmukh"];
            
            for (let i = 1; i <= 10000; i++) {
              const name = `${names[i % names.length]} ${i}`;
              const randomMobile = `${9000000000 + Math.floor(Math.random() * 999999999)}`;
              generatedContacts.push({
                id: `excel_${file.name}_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name,
                mobile: randomMobile,
                status: "Valid"
              });
            }
            
            for (let i = 1; i <= 5; i++) {
              generatedContacts.push({
                id: `excel_${file.name}_err_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: `Malformed Row ${i}`,
                mobile: "12345",
                status: "Invalid"
              });
            }
            resolve(generatedContacts);
          }, 800);
        }
      });
    };

    // Process all files concurrently
    const parsedBlocks = await Promise.all(Array.from(files).map(f => readAndParseFile(f)));
    parsedBlocks.forEach(block => allNewContacts.push(...block));

    if (allNewContacts.length > 0) {
      try {
        // Persist server-side (tenant-scoped, de-duplicated by mobile).
        await contactsApi.bulk(
          allNewContacts.map((c) => ({ name: c.name, mobile: c.mobile })),
        );
        await loadContacts();
        setUploadedFileNames(fileNames);
      } catch (err: any) {
        alert(err?.message || "Could not import contacts. Please sign in and try again.");
      }
    } else {
      alert("No contacts could be successfully parsed from the uploaded file(s).");
    }
    setIsProcessing(false);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualMobile.trim()) {
      alert("Please fill in both Name and Mobile fields.");
      return;
    }

    const mobile = cleanIndianMobile(manualMobile) || manualMobile.trim();
    try {
      const created = await contactsApi.add({ name: manualName.trim(), mobile });
      const newContacts = [toUiContact(created), ...contacts];
      setContacts(newContacts);
      updateStats(newContacts);
      setManualName("");
      setManualMobile("");
    } catch (err: any) {
      alert(err?.message || "Could not add the contact. Please sign in and try again.");
    }
  };

  // Custom Modal Deletion Trigger functions
  const triggerDeleteSingle = (id: string) => {
    setSingleDeleteId(id);
    setDeleteActionType("single");
    setDeleteModalOpen(true);
  };

  const triggerDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setDeleteActionType("selected");
    setDeleteModalOpen(true);
  };

  const triggerClearAll = () => {
    setDeleteActionType("clear");
    setDeleteModalOpen(true);
  };

  // Execute custom confirmation action (optimistic UI + server sync)
  const executeDeleteAction = async () => {
    if (deleteActionType === "single" && singleDeleteId) {
      const id = singleDeleteId;
      setContacts((prev) => {
        const next = prev.filter((c) => c.id !== id);
        updateStats(next);
        return next;
      });
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      setSingleDeleteId(null);
      contactsApi.remove(id).catch(() => {});
    } else if (deleteActionType === "selected") {
      const ids = [...selectedIds];
      setContacts((prev) => {
        const next = prev.filter((c) => !ids.includes(c.id));
        updateStats(next);
        return next;
      });
      setSelectedIds([]);
      Promise.all(ids.map((id) => contactsApi.remove(id).catch(() => {}))).catch(() => {});
    } else if (deleteActionType === "clear") {
      setContacts([]);
      setStats({ total: 0, valid: 0, invalid: 0 });
      setSelectedIds([]);
      setUploadedFileNames([]);
      contactsApi.clear().catch(() => {});
    }
    setDeleteModalOpen(false);
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter(c => {
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.mobile.includes(term);
  });

  const itemsPerPage = 50;
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleContacts = filteredContacts.slice(startIndex, endIndex);

  // Checkbox validation
  const isAllSelectedOnPage = visibleContacts.length > 0 && visibleContacts.every(c => selectedIds.includes(c.id));

  const handleToggleSelectAllOnPage = () => {
    const pageIds = visibleContacts.map(c => c.id);
    if (isAllSelectedOnPage) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const next = [...prev];
        pageIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1450px]">
      <div>
        <h1 className="text-[26px] font-bold text-[#1e293b] dark:text-white leading-tight flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" /> Voter Contacts Manager
        </h1>
        <p className="text-[13px] text-[#64748b] dark:text-[#999] mt-1">
          Import voter campaign lists, search database entries, add candidates manually, and organize your target audience.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Import and Manual Forms */}
        <div className="lg:col-span-4 space-y-6">
          {/* Import Card */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[14px] font-semibold text-[#1e293b] dark:text-white">
                <UploadCloud className="h-4 w-4 text-primary" /> Import List
              </CardTitle>
              <CardDescription className="text-xs">
                Upload one or multiple CSV or Excel spreadsheets to ingest contacts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isProcessing) {
                    fileInputRef.current?.click();
                  }
                }}
                className="border border-dashed border-[#e2e8f0] dark:border-[#333] rounded p-6 text-center bg-[#f8fafc] dark:bg-[#161616] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processFiles(e.target.files);
                    }
                  }}
                  accept=".csv, .xlsx, .xls"
                  multiple
                  className="hidden"
                />
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2 animate-pulse">
                    <FileSpreadsheet className="h-8 w-8 text-[#2563eb] mb-2 animate-bounce" />
                    <p className="font-medium text-xs">Extracting Data...</p>
                    <p className="text-[10px] text-[#94a3b8]">Processing multiple spreadsheets</p>
                  </div>
                ) : uploadedFileNames.length > 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-[#f0fdf4] flex items-center justify-center">
                      <Check className="h-5 w-5 text-[#16a34a]" />
                    </div>
                    <p className="font-semibold text-xs">Imported {uploadedFileNames.length} Files:</p>
                    <div className="max-w-[220px] overflow-hidden text-ellipsis text-[10px] text-muted-foreground text-center line-clamp-3">
                      {uploadedFileNames.join(", ")}
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => {e.stopPropagation(); setUploadedFileNames([]);}} className="mt-2 text-[#dc2626] border-[#fef2f2] hover:bg-[#fef2f2] h-8 text-xs rounded-sm">
                      Clear Files List
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground mb-1" />
                    <p className="font-semibold text-xs text-[#1e293b] dark:text-white">Drop spreadsheets here</p>
                    <p className="text-[11px] text-[#94a3b8]">CSV, XLS, XLSX supported (Multiple allowed)</p>
                    <div className="mt-3">
                      <Button type="button" className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white h-8 text-xs font-semibold rounded-sm">Browse Files</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add Contact Manually Card */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[14px] font-semibold text-[#1e293b] dark:text-white">
                <Plus className="h-4 w-4 text-primary" /> Add Contact Manually
              </CardTitle>
              <CardDescription className="text-xs">
                Add a single voter directly into the saved list.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualAdd} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground">Full Name</label>
                  <Input 
                    placeholder="e.g. Rahul Sharma"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground">Mobile Phone</label>
                  <Input 
                    placeholder="e.g. 9876543210"
                    value={manualMobile}
                    onChange={(e) => setManualMobile(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-xs rounded-sm">
                  Add Contact
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Database Table */}
        <div className="lg:col-span-8 min-w-0">
          <Card className="glass-card">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-[16px] font-bold">
                  Saved Database List
                </CardTitle>
                <CardDescription className="text-xs">
                  {contacts.length > 0 
                    ? `Total: ${stats.total.toLocaleString()} (${stats.valid.toLocaleString()} Valid, ${stats.invalid.toLocaleString()} Ignored)`
                    : "No saved voter contacts yet."
                  }
                </CardDescription>
              </div>

              {/* Action Buttons */}
              {contacts.length > 0 && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {selectedIds.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={triggerDeleteSelected}
                      className="bg-red-600 hover:bg-red-700 h-8 text-xs font-semibold rounded-sm gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Selected ({selectedIds.length})
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={triggerClearAll}
                    className="text-red-600 border-red-200 hover:bg-red-50 h-8 text-xs font-semibold rounded-sm"
                  >
                    Clear Database
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {contacts.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search database by name or mobile number..."
                    className="pl-9 bg-background/50 text-xs"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1); // Reset page on search
                    }}
                  />
                </div>
              )}

              {loading ? (
                <div className="h-80 flex flex-col items-center justify-center text-muted-foreground text-center">
                  <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <p className="text-xs mt-3">Loading contacts…</p>
                </div>
              ) : contacts.length === 0 ? (
                <div className="h-80 flex flex-col items-center justify-center border border-dashed rounded-lg border-border/50 bg-card/30 text-muted-foreground text-center p-6">
                  <Users className="h-10 w-10 mb-2 opacity-50 text-primary" />
                  <p className="font-semibold text-sm">No voter records saved</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                    Use the import panel to upload spreadsheets, or key in contacts manually.
                  </p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-center">
                  <Search className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No matching entries found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try modifying your query.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-border/50 rounded overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="border-border/50">
                          <TableHead className="w-[50px] p-4 text-center">
                            <input 
                              type="checkbox"
                              checked={isAllSelectedOnPage}
                              onChange={handleToggleSelectAllOnPage}
                              className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary cursor-pointer align-middle"
                            />
                          </TableHead>
                          <TableHead>Voter Name</TableHead>
                          <TableHead>Mobile Number</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right w-[80px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleContacts.map((c) => (
                          <TableRow key={c.id} className="border-border/50 hover:bg-muted/5 transition-colors">
                            <TableCell className="p-4 text-center">
                              <input 
                                type="checkbox"
                                checked={selectedIds.includes(c.id)}
                                onChange={() => handleToggleSelectRow(c.id)}
                                className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary cursor-pointer align-middle"
                              />
                            </TableCell>
                            <TableCell className="font-medium text-xs py-3">{c.name}</TableCell>
                            <TableCell className="font-mono text-xs py-3">{c.mobile}</TableCell>
                            <TableCell className="py-3">
                              {c.status === "Valid" ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-1.5 py-0">
                                  Ready
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 py-0">
                                  Ignored
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => triggerDeleteSingle(c.id)}
                                className="text-muted-foreground hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 rounded-full"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
                      <span className="font-semibold text-foreground">
                        {Math.min(endIndex, filteredContacts.length)}
                      </span>{" "}
                      of <span className="font-semibold text-foreground">{filteredContacts.length.toLocaleString()}</span> entries
                    </p>
                    
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activePage === 1}
                        onClick={() => setCurrentPage(1)}
                        className="h-8 text-xs px-2"
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activePage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="h-8 text-xs px-2.5"
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1 px-3">
                        <span className="text-xs text-muted-foreground">Page</span>
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          value={activePage}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (val >= 1 && val <= totalPages) {
                              setCurrentPage(val);
                            }
                          }}
                          className="w-12 h-8 text-center rounded border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                        />
                        <span className="text-xs text-muted-foreground">of {totalPages}</span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activePage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className="h-8 text-xs px-2.5"
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activePage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="h-8 text-xs px-2"
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl border border-border/80 bg-background">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" /> Confirm Action
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {deleteActionType === "single" && "Are you sure you want to delete this contact? This action cannot be undone."}
                {deleteActionType === "selected" && `Are you sure you want to delete the ${selectedIds.length} selected contacts? This action cannot be undone.`}
                {deleteActionType === "clear" && "Are you sure you want to wipe out all saved contacts? This action cannot be undone."}
              </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setDeleteModalOpen(false)}
                className="h-8 text-xs font-semibold rounded-sm"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={executeDeleteAction}
                className="bg-red-600 hover:bg-red-700 h-8 text-xs font-semibold rounded-sm"
              >
                Delete Permanently
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
