import { useEffect, useState } from "react";
import { Camera, ImageOff, Maximize2, Trash2 } from "lucide-react";
import { DemoPhoto } from "@/components/torque/DemoPhoto";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getWorkOrderPhoto } from "@/features/work-orders/lib/photo-storage";
import { getWorkOrderPhotoUrl } from "@/features/work-orders/api/photos";
import { isServerBackedWorkshop } from "@/stores/workshop.store";
function useWorkOrderPhotoUrl(photoId) {
  const [url, setUrl] = useState();
  const [loading, setLoading] = useState(Boolean(photoId));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let createdUrl;
    setLoading(Boolean(photoId));
    setFailed(false);
    setUrl(undefined);
    if (!photoId) return;
    const loadPhoto = isServerBackedWorkshop
      ? getWorkOrderPhotoUrl({ data: { photoId } }).then((result) => result.url)
      : getWorkOrderPhoto(photoId).then((blob) => (blob ? URL.createObjectURL(blob) : undefined));
    void loadPhoto
      .then((photoUrl) => {
        if (!photoUrl) {
          if (active) setFailed(true);
          return;
        }
        createdUrl = isServerBackedWorkshop ? undefined : photoUrl;
        if (active) setUrl(photoUrl);
        else if (createdUrl) URL.revokeObjectURL(createdUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [photoId]);
  return { url, loading, failed, setFailed };
}
function EvidenceVisual({
  evidence,
  imageUrl,
  loading,
  failed,
  title,
  caption,
  className,
  onImageError,
}) {
  if (!evidence?.photoId) {
    return (
      <DemoPhoto
        variant={evidence?.variant ?? 0}
        title={title}
        {...(caption ? { caption } : {})}
        {...(className ? { className } : {})}
      />
    );
  }
  if (!imageUrl || failed) {
    return (
      <div
        className={cn(
          "relative grid aspect-[16/10] place-items-center overflow-hidden rounded-2xl border border-border bg-muted text-center",
          className,
        )}
      >
        <div className="px-4">
          {failed ? (
            <ImageOff className="mx-auto size-6 text-muted-foreground" />
          ) : (
            <Camera className={cn("mx-auto size-6 text-primary", loading && "animate-pulse")} />
          )}
          <p className="mt-2 text-sm font-semibold">
            {failed ? "Foto indisponível" : "Carregando foto…"}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "group relative isolate aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-muted",
        className,
      )}
    >
      <img
        src={imageUrl}
        alt={title}
        onError={onImageError}
        className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 text-white sm:p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{title}</p>
          {caption && <p className="mt-0.5 truncate text-xs text-white/75">{caption}</p>}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2 py-1 text-[10px] font-semibold">
          <Camera className="size-3" /> {isServerBackedWorkshop ? "Foto privada" : "Foto local"}
        </span>
      </div>
    </div>
  );
}
export function WorkOrderEvidenceView({ evidence, title, caption, className }) {
  const photo = useWorkOrderPhotoUrl(evidence?.photoId);
  return (
    <EvidenceVisual
      evidence={evidence}
      imageUrl={photo.url}
      loading={photo.loading}
      failed={photo.failed}
      title={title}
      caption={caption}
      className={className}
      onImageError={() => photo.setFailed(true)}
    />
  );
}
export function WorkOrderEvidencePhoto({ evidence, categoryLabel, caption, onDelete }) {
  const photo = useWorkOrderPhotoUrl(evidence.photoId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const title = evidence.title;
  return (
    <article className="min-w-0">
      {evidence.photoId ? (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          aria-label={`Ampliar foto: ${title}`}
          className="group relative block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <EvidenceVisual
            evidence={evidence}
            imageUrl={photo.url}
            loading={photo.loading}
            failed={photo.failed}
            title={title}
            caption={categoryLabel}
            onImageError={() => photo.setFailed(true)}
          />
          <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg border border-white/20 bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Maximize2 className="size-4" />
          </span>
        </button>
      ) : (
        <EvidenceVisual evidence={evidence} title={title} caption={categoryLabel} />
      )}

      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{caption || "Sem observação"}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {evidence.photoId
              ? isServerBackedWorkshop
                ? "Foto privada da oficina"
                : "Foto armazenada neste navegador"
              : "Ilustração demonstrativa"}
          </p>
        </div>
        {evidence.photoId && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Excluir foto: ${title}`}
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir esta foto?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isServerBackedWorkshop
                    ? "A foto será removida do armazenamento privado e da linha do tempo da OS."
                    : "A foto será removida deste navegador e da linha do tempo da OS."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void onDelete(evidence)}>
                  Excluir foto
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {photo.url && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-5xl border-border bg-background/95 p-3 sm:p-4">
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <img
              src={photo.url}
              alt={title}
              className="mx-auto max-h-[82vh] w-full rounded-xl object-contain"
            />
            <p className="px-1 text-sm text-muted-foreground">{caption || categoryLabel}</p>
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
}
