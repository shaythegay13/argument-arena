import { useState } from "react";
import { Download, FileJson, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  buildDebateJSON,
  buildDebateMarkdown,
  downloadFile,
  slugifyTopic,
  type DebateExportInput,
} from "@/lib/exportDebate";

interface ExportDebateButtonProps extends DebateExportInput {
  isPro: boolean;
  onUpgrade: () => void;
}

const ExportDebateButton = ({ isPro, onUpgrade, ...data }: ExportDebateButtonProps) => {
  const { toast } = useToast();
  const [format, setFormat] = useState<"md" | "json">("md");
  const hasContent = data.rounds.length > 0;

  const doExport = (format: "json" | "md") => {
    const base = `startup-jury-${slugifyTopic(data.topic)}`;
    if (format === "json") {
      downloadFile(`${base}.json`, buildDebateJSON(data), "application/json");
    } else {
      downloadFile(`${base}.md`, buildDebateMarkdown(data), "text/markdown");
    }
    toast({
      title: "Export ready",
      description: `The full debate downloaded as ${format === "json" ? "JSON" : "Markdown"}.`,
    });
  };

  if (!isPro) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onUpgrade}
        className="border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs uppercase tracking-wide"
      >
        <Lock className="w-3.5 h-3.5 mr-2" />
        Export transcript · Pro
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      {/* Format toggle — the same Export button honours whichever format is active. */}
      <div className="inline-flex rounded-md border border-border overflow-hidden">
        {(["md", "json"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wide transition-colors ${
              format === f
                ? "bg-primary/15 text-primary"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={format === f}
          >
            {f === "md" ? <FileText className="w-3 h-3" /> : <FileJson className="w-3 h-3" />}
            {f === "md" ? "Markdown" : "JSON"}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={!hasContent}
        onClick={() => doExport(format)}
        className="border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs uppercase tracking-wide"
      >
        <Download className="w-3.5 h-3.5 mr-2" />
        Export {format === "md" ? ".md" : ".json"}
      </Button>
    </div>
  );
};

export default ExportDebateButton;
