import { ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function NoAccess() {
  return (
    <Card className="mx-auto mt-10 max-w-md">
      <CardContent className="p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">No tienes acceso a esta sección</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pídele al administrador que revise tu rol.</p>
      </CardContent>
    </Card>
  );
}
