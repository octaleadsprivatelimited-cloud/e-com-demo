"use client";

import React, { useState } from "react";
import { 
  Settings, 
  Save, 
  KeyRound, 
  Shield, 
  Bell, 
  MessageSquare, 
  MessageCircle, 
  PhoneCall, 
  Cpu,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export default function CustomerSettings() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Profile Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  React.useEffect(() => {
    const sessionUser = localStorage.getItem("currentCustomerUser");
    if (sessionUser) {
      try {
        const parsed = JSON.parse(sessionUser);
        setCurrentUser(parsed);
        
        // Parse profile
        const parts = (parsed.name || "Rahul Sharma").split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
        setEmail(parsed.email || `${parts[0]?.toLowerCase()}@poltica.in`);
      } catch (e) {}
    }
  }, []);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      alert("Password successfully updated!");
    }, 1000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const updatedUser = {
      ...currentUser,
      name: fullName,
      email: email,
    };

    localStorage.setItem("currentCustomerUser", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);

    const pool = JSON.parse(localStorage.getItem("poltica_candidates") || "[]");
    const updatedPool = pool.map((c: any) => {
      if (c.mobile === currentUser.mobile || c.id === currentUser.id) {
        return {
          ...c,
          name: fullName,
          email: email,
        };
      }
      return c;
    });
    localStorage.setItem("poltica_candidates", JSON.stringify(updatedPool));

    setTimeout(() => {
      setIsSaving(false);
      alert("Profile successfully updated!");
    }, 800);
  };

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6 max-w-[1200px] animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
            Manage your candidate profile details, login security credentials, and system notifications.
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 w-max sm:w-auto inline-flex p-1 rounded-xl">
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-850 data-[state=active]:text-primary data-[state=active]:shadow-sm px-6 py-2 rounded-lg text-sm font-semibold transition-all"
            >
              Profile Settings
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-850 data-[state=active]:text-primary data-[state=active]:shadow-sm px-6 py-2 rounded-lg text-sm font-semibold transition-all"
            >
              Security & Access
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-850 data-[state=active]:text-primary data-[state=active]:shadow-sm px-6 py-2 rounded-lg text-sm font-semibold transition-all"
            >
              Notifications
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-6 animate-fade-in-up">
          <Card className="glass-card overflow-hidden">
            <form onSubmit={handleSaveProfile}>
              <CardHeader className="bg-gradient-to-b from-zinc-50/50 to-transparent dark:from-zinc-900/30">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Personal Information
                </CardTitle>
                <CardDescription>Update your candidate profile details and contact coordinates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-6 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">First Name</Label>
                    <Input 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      className="bg-background/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Last Name</Label>
                    <Input 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      className="bg-background/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary h-10" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Email Address</Label>
                  <Input 
                    value={email} 
                    type="email"
                    onChange={(e) => setEmail(e.target.value)} 
                    className="bg-background/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary h-10" 
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-zinc-150 dark:border-zinc-850 p-6 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-end">
                <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/95 text-white shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all font-semibold">
                  <Save className="mr-2 h-4 w-4" /> 
                  {isSaving ? "Saving Updates..." : "Save Profile Details"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 animate-fade-in-up">
          <div className="grid gap-6 md:grid-cols-5 items-start">
            <Card className="glass-card md:col-span-3">
              <form onSubmit={handlePasswordChange}>
                <CardHeader className="bg-gradient-to-b from-zinc-50/50 to-transparent dark:from-zinc-900/30">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <KeyRound className="h-5 w-5 text-primary" /> Reset Password
                  </CardTitle>
                  <CardDescription>
                    Ensure your account is using a long, random password to stay secure against attacks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="current" className="text-xs font-bold uppercase tracking-wider text-zinc-500">Current Password</Label>
                    <Input id="current" type="password" required className="bg-background/50 border-zinc-200 dark:border-zinc-800 h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new" className="text-xs font-bold uppercase tracking-wider text-zinc-500">New Password</Label>
                    <Input id="new" type="password" required className="bg-background/50 border-zinc-200 dark:border-zinc-800 h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm" className="text-xs font-bold uppercase tracking-wider text-zinc-500">Confirm New Password</Label>
                    <Input id="confirm" type="password" required className="bg-background/50 border-zinc-200 dark:border-zinc-800 h-10" />
                  </div>
                </CardContent>
                <CardFooter className="border-t border-zinc-150 dark:border-zinc-850 p-6 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-end">
                  <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/95 text-white font-semibold">
                    {isSaving ? "Updating password..." : "Change Account Password"}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card className="glass-card md:col-span-2 border-primary/20 bg-primary/5 dark:bg-primary/2 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary text-base font-bold">
                  <Shield className="h-5 w-5" /> Two-Factor Authentication (2FA)
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your candidate portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Two-factor authentication is currently <strong className="text-destructive">disabled</strong>. We highly recommend enabling phone verification to secure your voter rolls and database details.
                </p>
                <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10 font-bold transition-all">
                  Enable Authenticator 2FA
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 animate-fade-in-up">
          <Card className="glass-card">
            <CardHeader className="bg-gradient-to-b from-zinc-50/50 to-transparent dark:from-zinc-900/30">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Bell className="h-5 w-5 text-primary" /> Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to be alerted regarding campaign delivery metrics.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl bg-white/40 dark:bg-zinc-900/20 hover:shadow-sm transition-all">
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-zinc-850 dark:text-zinc-150">Campaign Completions</p>
                    <p className="text-xs text-zinc-500">Receive email and SMS notifications immediately when a dialer or SMS campaign concludes.</p>
                  </div>
                  <Button variant="secondary" size="sm" className="font-bold text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">Enabled</Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl bg-white/40 dark:bg-zinc-900/20 hover:shadow-sm transition-all">
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-zinc-850 dark:text-zinc-150">Low Quota Alerts</p>
                    <p className="text-xs text-zinc-500">Get instantly notified if your remaining SMS/WhatsApp credits drop below 10%.</p>
                  </div>
                  <Button variant="secondary" size="sm" className="font-bold text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">Enabled</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
