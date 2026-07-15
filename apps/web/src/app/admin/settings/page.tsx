import React from "react";
import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Platform configurations and API keys.
          </p>
        </div>
      </div>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Preferences</CardTitle>
          <CardDescription>
            Manage global platform configurations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg border-border/50 bg-card/30">
            <span className="text-sm text-muted-foreground">Settings Form will go here</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
