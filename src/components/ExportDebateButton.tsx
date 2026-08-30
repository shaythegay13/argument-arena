import { Download, FileJson, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasContent}
          className="border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs uppercase tracking-wide"
        >
          <Download className="w-3.5 h-3.5 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        <DropdownMenuItem onClick={() => doExport("md")} className="cursor-pointer">
          <FileText className="w-4 h-4 mr-2" />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => doExport("json")} className="cursor-pointer">
          <FileJson className="w-4 h-4 mr-2" />
          JSON (.json)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportDebateButton;
