import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/services/adapters/supabase/client";
import { toast } from "sonner";
import { ALL_MODULES, type AppModule, type AppRole } from "@/context/AuthContext";
import { ALL_ACTIONS, ACTION_LABELS, MODULE_LABELS, ROLE_DESCRIPTIONS, ROLE_LABELS, type AppAction } from "@/lib/permissions";
import { applyRolePermissionsToUsers } from "@/lib/applyRolePermissions";
import { notifyError } from "@/lib/errorMessages";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
}

type Matrix = Record<AppRole, Record<AppModule, Record<AppAction, boolean>>>;

const emptyMatrix = (): Matrix => {
  const m: any = {};
  (["admin", "user", "viewer"] as AppRole[]).forEach((r) => {
    m[r] = {};
    ALL_MODULES.forEach((mod) => {
      m[r][mod] = {};
      ALL_ACTIONS.forEach((a) => { m[r][mod][a] = false; });
    });
  });
  return m as Matrix;
};

export function RolePermissionsDrawer({ open, onOpenChange, onSaved }: Props) {
  const [matrix, setMatrix] = useState<Matrix>(emptyMatrix());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<AppRole>("user");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("role_permissions")
      .select("role, module, action, allowed")
      .then(({ data }) => {
        const m = emptyMatrix();
        (data ?? []).forEach((r: any) => {
          if (m[r.role as AppRole]?.[r.module as AppModule]) {
            m[r.role as AppRole][r.module as AppModule][r.action as AppAction] = !!r.allowed;
          }
        });
        setMatrix(m);
        setLoading(false);
      });
  }, [open]);

  const toggle = (role: AppRole, mod: AppModule, action: AppAction) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [mod]: { ...prev[role][mod], [action]: !prev[role][mod][action] } },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const rows: any[] = [];
      (["admin", "user", "viewer"] as AppRole[]).forEach((r) => {
        ALL_MODULES.forEach((mod) => {
          ALL_ACTIONS.forEach((a) => {
            rows.push({ role: r, module: mod, action: a, allowed: matrix[r][mod][a] });
          });
        });
      });
      await supabase.from("role_permissions").delete().gte("updated_at", "1900-01-01");
      const { error } = await supabase.from("role_permissions").insert(rows);
      if (error) throw error;

      // Replica para os usuários de cada perfil (exceto os com permissão personalizada)
      const { data: roleUsers } = await supabase.from("user_roles").select("user_id, role");
      const byRole: Record<AppRole, string[]> = { admin: [], user: [], viewer: [] };
      (roleUsers ?? []).forEach((r: any) => {
        if (byRole[r.role as AppRole]) byRole[r.role as AppRole].push(r.user_id);
      });
      await Promise.all(
        (["admin", "user", "viewer"] as AppRole[]).map((r) =>
          applyRolePermissionsToUsers(r, byRole[r]),
        ),
      );

      toast.success("Permissões globais aplicadas aos usuários de cada perfil");
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      notifyError(err, "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Permissões globais por perfil</SheetTitle>
          <SheetDescription>Define o que cada perfil pode fazer em cada módulo.</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as AppRole)} className="mt-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="admin">{ROLE_LABELS.admin}</TabsTrigger>
              <TabsTrigger value="user">{ROLE_LABELS.user}</TabsTrigger>
              <TabsTrigger value="viewer">{ROLE_LABELS.viewer}</TabsTrigger>
            </TabsList>

            {(["admin", "user", "viewer"] as AppRole[]).map((r) => (
              <TabsContent key={r} value={r} className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
                {r === "admin" && (
                  <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                    <Lock className="h-4 w-4 text-primary" />
                    O perfil administrador tem acesso total e não pode ser limitado.
                  </div>
                )}
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="sticky left-0 bg-muted p-2 text-left font-medium">Módulo</th>
                        {ALL_ACTIONS.map((a) => (
                          <th key={a} className="p-2 text-center font-medium text-xs">{ACTION_LABELS[a]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_MODULES.map((mod) => (
                        <tr key={mod} className="border-t border-border">
                          <td className="sticky left-0 bg-card p-2 font-medium">{MODULE_LABELS[mod]}</td>
                          {ALL_ACTIONS.map((a) => (
                            <td key={a} className="p-2 text-center">
                              <Switch
                                checked={r === "admin" ? true : matrix[r][mod][a]}
                                disabled={r === "admin"}
                                onCheckedChange={() => toggle(r, mod, a)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar permissões
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
