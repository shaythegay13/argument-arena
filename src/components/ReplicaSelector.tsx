import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const TAVUS_EDGE_FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/tavus-clip`;

interface Replica {
  replica_id: string;
  replica_name: string;
  thumbnail_video_url: string | null;
  status: string;
}

interface ReplicaSelectorProps {
  value: string;
  onChange: (replicaId: string) => void;
}

const ReplicaSelector = ({ value, onChange }: ReplicaSelectorProps) => {
  const [replicas, setReplicas] = useState<Replica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReplicas = async () => {
      try {
        const res = await fetch(`${TAVUS_EDGE_FN_URL}?list_replicas=true`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (!res.ok) throw new Error("Failed to fetch replicas");
        const data = await res.json();
        const ready = (data.replicas || []).filter((r: Replica) => r.status === "ready");
        setReplicas(ready);
        if (ready.length > 0 && !value) {
          onChange(ready[0].replica_id);
        }
      } catch (err) {
        console.error("[Tavus] Failed to load replicas:", err);
        setError("Could not load voices");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReplicas();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading voices…
      </div>
    );
  }

  if (error || replicas.length === 0) {
    return (
      <p className="text-xs text-destructive">
        {error || "No Tavus replicas found. Create one in your Tavus dashboard."}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
        Host Voice / Avatar
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full max-w-xs bg-muted/50 border-border">
          <SelectValue placeholder="Select a voice…" />
        </SelectTrigger>
        <SelectContent>
          {replicas.map((r) => (
            <SelectItem key={r.replica_id} value={r.replica_id}>
              {r.replica_name || r.replica_id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ReplicaSelector;
