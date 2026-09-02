import { Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LinkedBadge({ title = "Vinculado por nota fiscal" }: { title?: string }) {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-primary/40 bg-primary/5 text-primary text-[10px] px-1.5 py-0"
      title={title}
    >
      <Link2 className="h-3 w-3" /> Vinculado
    </Badge>
  );
}
