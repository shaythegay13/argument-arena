import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Brain } from "lucide-react";

const STORAGE_KEY = "ai_disclosure_acknowledged";

const AIDisclosureModal = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const acknowledged = localStorage.getItem(STORAGE_KEY);
    if (!acknowledged) {
      setOpen(true);
    }
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-primary" />
            <AlertDialogTitle className="text-base">AI-Generated Content Disclosure</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm leading-relaxed space-y-3">
            <span className="block">
              Startup Jury AI uses generative artificial intelligence to simulate expert panel debates and produce startup evaluations.
            </span>
            <span className="block">
              All persona opinions, scores, and verdicts are AI-generated and do not constitute professional investment, legal, or business advice. Results may contain inaccuracies.
            </span>
            <span className="block text-muted-foreground text-xs">
              By continuing, you acknowledge that this app uses external AI services and that all content is machine-generated.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleAcknowledge} className="w-full">
            I Understand — Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AIDisclosureModal;
