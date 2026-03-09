import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface CommunityVoteProps {
  sessionId: string;
  compact?: boolean;
}

function getFingerprint(): string {
  let fp = localStorage.getItem("sj_voter_fp");
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem("sj_voter_fp", fp);
  }
  return fp;
}

export default function CommunityVote({ sessionId, compact }: CommunityVoteProps) {
  const [promising, setPromising] = useState(0);
  const [notStartup, setNotStartup] = useState(0);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fp = getFingerprint();

  useEffect(() => {
    // Load counts
    supabase
      .from("leaderboard_votes" as any)
      .select("vote_type, voter_fingerprint")
      .eq("session_id", sessionId)
      .then(({ data }: any) => {
        if (!data) return;
        setPromising(data.filter((v: any) => v.vote_type === "promising").length);
        setNotStartup(data.filter((v: any) => v.vote_type === "not_a_startup").length);
        const mine = data.find((v: any) => v.voter_fingerprint === fp);
        if (mine) setUserVote(mine.vote_type);
      });
  }, [sessionId, fp]);

  const vote = async (type: "promising" | "not_a_startup") => {
    if (userVote || loading) return;
    setLoading(true);
    const { error } = await (supabase as any)
      .from("leaderboard_votes")
      .insert({ session_id: sessionId, vote_type: type, voter_fingerprint: fp });

    if (!error) {
      setUserVote(type);
      if (type === "promising") setPromising((p) => p + 1);
      else setNotStartup((p) => p + 1);
    }
    setLoading(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={(e) => { e.stopPropagation(); vote("promising"); }}
          disabled={!!userVote || loading}
          className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-colors ${
            userVote === "promising"
              ? "border-verdict-go/40 bg-verdict-go/10 text-verdict-go"
              : "border-border text-muted-foreground hover:text-verdict-go hover:border-verdict-go/30"
          } ${userVote && userVote !== "promising" ? "opacity-40" : ""}`}
        >
          <ThumbsUp className="w-3 h-3" />
          {promising}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); vote("not_a_startup"); }}
          disabled={!!userVote || loading}
          className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-colors ${
            userVote === "not_a_startup"
              ? "border-verdict-nogo/40 bg-verdict-nogo/10 text-verdict-nogo"
              : "border-border text-muted-foreground hover:text-verdict-nogo hover:border-verdict-nogo/30"
          } ${userVote && userVote !== "not_a_startup" ? "opacity-40" : ""}`}
        >
          <ThumbsDown className="w-3 h-3" />
          {notStartup}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Community</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => vote("promising")}
        disabled={!!userVote || loading}
        className={`gap-1.5 rounded-[10px] ${userVote === "promising" ? "border-verdict-go/40 bg-verdict-go/10 text-verdict-go" : ""}`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        👍 Promising ({promising})
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => vote("not_a_startup")}
        disabled={!!userVote || loading}
        className={`gap-1.5 rounded-[10px] ${userVote === "not_a_startup" ? "border-verdict-nogo/40 bg-verdict-nogo/10 text-verdict-nogo" : ""}`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        👎 Not a Startup ({notStartup})
      </Button>
    </div>
  );
}
