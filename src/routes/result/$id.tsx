import { createFileRoute } from "@tanstack/react-router";
import ResultPage from "@/pages/ResultPage";

export const Route = createFileRoute("/result/$id")({
  component: ResultPage,
});
