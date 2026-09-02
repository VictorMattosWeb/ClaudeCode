import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, FileEdit } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { DeleteRequestDialog, type DeleteItemType } from "./DeleteRequestDialog";

interface Props {
  tipo: DeleteItemType;
  itemId: string;
  itemDescricao?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  onConfirmDelete: () => void;
  size?: "icon" | "sm";
  className?: string;
}

/**
 * Botão de exclusão sensível ao perfil:
 * - Admin: dispara AlertDialog e executa onConfirmDelete
 * - Usuário padrão: dispara DeleteRequestDialog (solicitação para aprovação)
 */
export function RowDeleteAction({
  tipo, itemId, itemDescricao,
  confirmTitle = "Excluir item?",
  confirmDescription = "Esta ação não pode ser desfeita.",
  onConfirmDelete,
  size = "icon",
  className = "",
}: Props) {
  const { isAdmin, canWrite } = useAuth();
  const [openAdmin, setOpenAdmin] = useState(false);
  const [openReq, setOpenReq] = useState(false);

  if (!canWrite) return null;

  if (isAdmin) {
    return (
      <>
        <Button
          variant="ghost"
          size={size === "icon" ? "icon" : "sm"}
          className={size === "icon" ? `h-8 w-8 hover:bg-destructive/10 ${className}` : className}
          onClick={() => setOpenAdmin(true)}
          title="Excluir"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
          {size !== "icon" && <span className="ml-1.5">Excluir</span>}
        </Button>
        <AlertDialog open={openAdmin} onOpenChange={setOpenAdmin}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirmDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size={size === "icon" ? "icon" : "sm"}
        className={size === "icon" ? `h-8 w-8 hover:bg-warning/10 ${className}` : className}
        onClick={() => setOpenReq(true)}
        title="Solicitar exclusão"
      >
        <FileEdit className="h-4 w-4 text-warning" />
        {size !== "icon" && <span className="ml-1.5">Solicitar exclusão</span>}
      </Button>
      <DeleteRequestDialog
        open={openReq}
        onOpenChange={setOpenReq}
        tipo={tipo}
        itemId={itemId}
        itemDescricao={itemDescricao}
      />
    </>
  );
}
