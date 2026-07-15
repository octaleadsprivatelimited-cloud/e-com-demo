"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  FileSpreadsheet, 
  Trash2, 
  UserCheck, 
  Filter, 
  CheckCircle2, 
  Sparkles,
  PieChart as PieIcon,
  Smile
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { votersApi } from "@/lib/api";

type Voter = {
  id: string;
  name: string;
  mobile: string;
  gender: "Male" | "Female";
  age: number;
  area: string;
  inclination: "Strong Support" | "Leaning Support" | "Undecided" | "Opposed";
  segment: "Youth" | "Farmer" | "Senior Citizen" | "Women" | "Trader";
};

const initialVoters: Voter[] = [
  { id: "VOT-0101", name: "Sanjay Deshpande", mobile: "9823012345", gender: "Male", age: 34, area: "Sadashiv Peth", inclination: "Strong Support", segment: "Trader" },
  { id: "VOT-0102", name: "Sunita Kulkarni", mobile: "9823054321", gender: "Female", age: 52, area: "Sadashiv Peth", inclination: "Leaning Support", segment: "Women" },
  { id: "VOT-0103", name: "Dnyaneshwar Patil", mobile: "9977011223", gender: "Male", age: 62, area: "Karad North", inclination: "Undecided", segment: "Farmer" },
  { id: "VOT-0104", name: "Anjali Shinde", mobile: "9422055667", gender: "Female", age: 24, area: "Nashik East", inclination: "Strong Support", segment: "Youth" },
  { id: "VOT-0105", name: "Ketan Mehta", mobile: "9890123456", gender: "Male", age: 71, area: "Nagpur South", inclination: "Opposed", segment: "Senior Citizen" },
  { id: "VOT-0106", name: "Pooja Gokhale", mobile: "9021234567", gender: "Female", age: 29, area: "Sadashiv Peth", inclination: "Leaning Support", segment: "Youth" }
];

export default function VotersPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [inclinationFilter, setInclinationFilter] = useState("all");

  // Modal forms
  const [isAddVoterOpen, setIsAddVoterOpen] = useState(false);
  const [newVoterName, setNewVoterName] = useState("");
  const [newVoterMobile, setNewVoterMobile] = useState("");
  const [newVoterGender, setNewVoterGender] = useState<"Male" | "Female">("Male");
  const [newVoterAge, setNewVoterAge] = useState("");
  const [newVoterArea, setNewVoterArea] = useState("");
  const [newVoterInclination, setNewVoterInclination] = useState<any>("Undecided");
  const [newVoterSegment, setNewVoterSegment] = useState<any>("Youth");

  useEffect(() => {
    (async () => {
      try {
        const list = await votersApi.list();
        if (Array.isArray(list)) {
          setVoters(list as Voter[]);
          return;
        }
      } catch {
        // fall through to local cache
      }
      const cached = localStorage.getItem("poltica_voters");
      setVoters(cached ? JSON.parse(cached) : initialVoters);
    })();
  }, []);

  const handleAddVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoterName || !newVoterMobile || !newVoterAge || !newVoterArea) {
      alert("Please fill all required fields!");
      return;
    }

    const newVoter: Voter = {
      id: `VOT-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: newVoterName,
      mobile: newVoterMobile,
      gender: newVoterGender,
      age: parseInt(newVoterAge),
      area: newVoterArea,
      inclination: newVoterInclination,
      segment: newVoterSegment
    };

    const updated = [newVoter, ...voters];
    setVoters(updated);
    localStorage.setItem("poltica_voters", JSON.stringify(updated));
    votersApi.create(newVoter).catch(() => {});

    // Reset Form
    setNewVoterName("");
    setNewVoterMobile("");
    setNewVoterAge("");
    setNewVoterArea("");
    setIsAddVoterOpen(false);
    alert(`Voter ${newVoterName} added successfully to CRM.`);
  };

  const handleImportSample = () => {
    const samples: Voter[] = [
      { id: "VOT-0201", name: "Ramesh Pawar", mobile: "9561023456", gender: "Male", age: 45, area: "Nashik East", inclination: "Strong Support", segment: "Farmer" },
      { id: "VOT-0202", name: "Vidya Thorat", mobile: "9823485748", gender: "Female", age: 39, area: "Sadashiv Peth", inclination: "Undecided", segment: "Women" },
      { id: "VOT-0203", name: "Aarav Joshi", mobile: "9921045938", gender: "Male", age: 21, area: "Pune", inclination: "Leaning Support", segment: "Youth" },
      { id: "VOT-0204", name: "Meena Kadam", mobile: "9124857364", gender: "Female", age: 67, area: "Karad North", inclination: "Strong Support", segment: "Senior Citizen" }
    ];

    const updated = [...samples, ...voters];
    setVoters(updated);
    localStorage.setItem("poltica_voters", JSON.stringify(updated));
    votersApi.importMany(samples).catch(() => {});
    alert("4 sample voter records imported successfully!");
  };

  const handleDeleteVoter = (id: string) => {
    if (confirm("Are you sure you want to remove this voter from the CRM database?")) {
      const updated = voters.filter(v => v.id !== id);
      setVoters(updated);
      localStorage.setItem("poltica_voters", JSON.stringify(updated));
      votersApi.remove(id).catch(() => {});
    }
  };

  const toggleInclination = (id: string) => {
    const inclinations: Array<Voter["inclination"]> = ["Strong Support", "Leaning Support", "Undecided", "Opposed"];
    let nextInclination: Voter["inclination"] | null = null;
    const updated = voters.map(v => {
      if (v.id === id) {
        const nextIndex = (inclinations.indexOf(v.inclination) + 1) % inclinations.length;
        nextInclination = inclinations[nextIndex];
        return { ...v, inclination: nextInclination };
      }
      return v;
    });
    setVoters(updated);
    localStorage.setItem("poltica_voters", JSON.stringify(updated));
    if (nextInclination) votersApi.update(id, { inclination: nextInclination }).catch(() => {});
  };

  const filteredVoters = voters.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
                          v.mobile.includes(search) || 
                          v.area.toLowerCase().includes(search.toLowerCase());
    
    const matchesGender = genderFilter === "all" || v.gender === genderFilter;
    const matchesInclination = inclinationFilter === "all" || v.inclination === inclinationFilter;

    return matchesSearch && matchesGender && matchesInclination;
  });

  const getInclinationBadge = (incl: Voter["inclination"]) => {
    switch (incl) {
      case "Strong Support":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Strong Support</Badge>;
      case "Leaning Support":
        return <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20">Leaning Support</Badge>;
      case "Undecided":
        return <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20">Undecided</Badge>;
      case "Opposed":
        return <Badge className="bg-destructive/10 text-destructive border border-destructive/20">Opposed</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
            Voter Database CRM
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Platform-wide voter intelligence dashboard with demographic filtering and target list exports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleImportSample} variant="outline" className="border-primary/30 text-primary hover:bg-primary/5 h-9 text-xs">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel / CSV
          </Button>
          <Button onClick={() => setIsAddVoterOpen(true)} className="h-9 text-xs">
            <Plus className="mr-2 h-4 w-4" /> Add Voter Profile
          </Button>
        </div>
      </div>

      {/* Database KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Registered Voters", value: voters.length, desc: "Across all villages", icon: Users, color: "text-primary" },
          { title: "Strong Supporters", value: voters.filter(v => v.inclination === "Strong Support").length, desc: "Loyal voter core", icon: UserCheck, color: "text-emerald-500" },
          { title: "Undecided Voters", value: voters.filter(v => v.inclination === "Undecided").length, desc: "Key focus campaigns", icon: Sparkles, color: "text-amber-500" },
          { title: "Youth Audience (18-35)", value: voters.filter(v => v.age >= 18 && v.age <= 35).length, desc: "Digital media targets", icon: Smile, color: "text-indigo-500" }
        ].map((stat, i) => (
          <Card key={i} className="glass-card shadow-sm border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter and Table Card */}
      <Card className="glass-card border border-border/50">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle>Voter Profiles CRM</CardTitle>
              <CardDescription>Segment demographics, villages, and support rates.</CardDescription>
            </div>
            
            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px] lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, mobile, village..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-background/50 pl-9 h-9 border-border/50 text-xs"
                />
              </div>

              <select
                className="h-9 px-2 rounded-md border border-border/50 bg-background/50 text-xs focus:outline-none"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              <select
                className="h-9 px-2 rounded-md border border-border/50 bg-background/50 text-xs focus:outline-none"
                value={inclinationFilter}
                onChange={(e) => setInclinationFilter(e.target.value)}
              >
                <option value="all">All Inclinations</option>
                <option value="Strong Support">Strong Support</option>
                <option value="Leaning Support">Leaning Support</option>
                <option value="Undecided">Undecided</option>
                <option value="Opposed">Opposed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-card/40">
              <TableRow className="border-border/50">
                <TableHead>Voter Name</TableHead>
                <TableHead>Demographics</TableHead>
                <TableHead>Village / Area</TableHead>
                <TableHead>Inclination Status</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVoters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No voters matching filters found. Try importing samples.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVoters.map((voter) => (
                  <TableRow key={voter.id} className="border-border/50 hover:bg-accent/40">
                    <TableCell className="font-medium">
                      <div>{voter.name}</div>
                      <div className="text-[10px] text-muted-foreground">{voter.id} • {voter.mobile}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {voter.gender} • Age {voter.age}
                    </TableCell>
                    <TableCell className="text-xs">{voter.area}</TableCell>
                    <TableCell>
                      <button 
                        onClick={() => toggleInclination(voter.id)} 
                        title="Click to cycle inclination level"
                        className="focus:outline-none hover:opacity-85 transition-opacity"
                      >
                        {getInclinationBadge(voter.inclination)}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-card text-foreground border border-border text-[10px]">
                        {voter.segment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        onClick={() => handleDeleteVoter(voter.id)}
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete Voter"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Voter Modal */}
      <Dialog open={isAddVoterOpen} onOpenChange={setIsAddVoterOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-border/50">
          <form onSubmit={handleAddVoter}>
            <DialogHeader>
              <DialogTitle>Add Voter Profile</DialogTitle>
              <DialogDescription>
                Create a new voter intelligence card in the dashboard CRM.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Voter Full Name</Label>
                <Input 
                  placeholder="e.g. Ramesh Patil" 
                  value={newVoterName} 
                  onChange={(e) => setNewVoterName(e.target.value)} 
                  required 
                  className="bg-background/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>Mobile Number</Label>
                  <Input 
                    placeholder="10-digit number" 
                    value={newVoterMobile} 
                    onChange={(e) => setNewVoterMobile(e.target.value)} 
                    required 
                    maxLength={10} 
                    className="bg-background/50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Age</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 42" 
                    value={newVoterAge} 
                    onChange={(e) => setNewVoterAge(e.target.value)} 
                    required 
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>Gender</Label>
                  <select
                    className="h-10 px-3 rounded-md border border-input bg-background/50 text-sm focus:outline-none"
                    value={newVoterGender}
                    onChange={(e) => setNewVoterGender(e.target.value as any)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Constituency / Village</Label>
                  <Input 
                    placeholder="e.g. Sadashiv Peth" 
                    value={newVoterArea} 
                    onChange={(e) => setNewVoterArea(e.target.value)} 
                    required 
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>Inclination</Label>
                  <select
                    className="h-10 px-3 rounded-md border border-input bg-background/50 text-sm focus:outline-none"
                    value={newVoterInclination}
                    onChange={(e) => setNewVoterInclination(e.target.value as any)}
                  >
                    <option value="Strong Support">Strong Support</option>
                    <option value="Leaning Support">Leaning Support</option>
                    <option value="Undecided">Undecided</option>
                    <option value="Opposed">Opposed</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Voter Segment</Label>
                  <select
                    className="h-10 px-3 rounded-md border border-input bg-background/50 text-sm focus:outline-none"
                    value={newVoterSegment}
                    onChange={(e) => setNewVoterSegment(e.target.value as any)}
                  >
                    <option value="Youth">Youth</option>
                    <option value="Farmer">Farmer</option>
                    <option value="Women">Women</option>
                    <option value="Trader">Trader</option>
                    <option value="Senior Citizen">Senior Citizen</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsAddVoterOpen(false)}>Cancel</Button>
              <Button type="submit">Save Voter</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
