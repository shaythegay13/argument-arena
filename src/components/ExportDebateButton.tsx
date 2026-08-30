import { useState } from "react";
import { Download, FileJson, FileText, FileType2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  buildDebateJSON,
  buildDebateMarkdown,
  downloadFile,
  slugifyTopic,
  type DebateExportInput,
} from "@/lib/exportDebate";
import { downloadDebatePdf } from "@/lib/exportDebatePdf";

interface ExportDebateButtonProps extends DebateExportInput {
  isPro: boolean;
  onUpgrade: () => void;
}

type ExportFormat = "md" | "json" | "pdf";

const FORMAT_META: Record<ExportFormat, { label: string; ext: string }> = {
  md: { label: "Markdown", ext: ".md" },
  json: { label: "JSON", ext: ".json" },
  pdf: { label: "PDF", ext: ".pdf" },
};

const ExportDebateButton = ({ isPro, onUpgrade, ...data }: ExportDebateButtonProps) => {
  const { toast } = useToast();
  const [format, setFormat] = useState<ExportFormat>("md");
  const [isExporting, setIsExporting] = useState(false);
  const hasContent = data.rounds.length > 0;

  const doExport = async (fmt: ExportFormat) => {
    const base = `startup-jury-${slugifyTopic(data.topic)}`;
    setIsExporting(true);
    try {
      if (fmt === "json") {
        downloadFile(`${base}.json`, buildDebateJSON(data), "application/json");
      } else if (fmt === "md") {
        downloadFile(`${base}.md`, buildDebateMarkdown(data), "text/markdown");
      } else {
        await downloadDebatePdf(data, `${base}.pdf`);
      }
      toast({
        title: "Export ready",
        description: `The full debate downloaded as ${FORMAT_META[fmt].label}.`,
      });
    } catch (e) {
      console.error("[export] failed:", e);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Could not build the file. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isPro) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onUpgrade}
        className="border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs uppercase tracking-wide"
      >
        <Lock className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
        Export transcript · Pro
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      {/* Format toggle — the same Export button honours whichever format is active. */}
      <div
        role="radiogroup"
        aria-label="Export file format"
        className="inline-flex rounded-md border border-border overflow-hidden"
      >
        {(["md", "json", "pdf"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              format === f
                ? "bg-primary/15 text-primary"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
            role="radio"
            aria-checked={format === f}
            aria-label={`Export as ${FORMAT_META[f].label}`}
          >
            {f === "md" ? (
              <FileText className="w-3 h-3" aria-hidden="true" />
            ) : f === "json" ? (
              <FileJson className="w-3 h-3" aria-hidden="true" />
            ) : (
              <FileType2 className="w-3 h-3" aria-hidden="true" />
            )}
            {FORMAT_META[f].label}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={!hasContent || isExporting}
        onClick={() => void doExport(format)}
        aria-label={`Export results as ${FORMAT_META[format].label}`}
        className="border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs uppercase tracking-wide"
      >
        <Download className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
        {isExporting ? "Preparing…" : `Export results ${FORMAT_META[format].ext}`}
      </Button>
    </div>
  );
};

export default ExportDebateButton;
