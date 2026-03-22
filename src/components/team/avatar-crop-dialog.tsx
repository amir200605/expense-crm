"use client";

import { useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getCroppedImageBlob } from "@/lib/avatar-crop-utils";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with cropped JPEG blob after user confirms */
  onCropped: (blob: Blob) => Promise<void>;
};

export function AvatarCropDialog({ open, onOpenChange, onCropped }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be 8MB or smaller.");
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    setImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
  }

  function handleClose(next: boolean) {
    if (!next) {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
      setError(null);
      setSaving(false);
    }
    onOpenChange(next);
  }

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) {
      setError("Adjust the crop, then save.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      await onCropped(blob);
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save photo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" showClose={!saving}>
        <DialogHeader>
          <DialogTitle>Profile photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!imageSrc ? (
            <div className="space-y-2">
              <Label htmlFor="avatar-file">Choose an image</Label>
              <input
                id="avatar-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                Then you can zoom and crop to a square before uploading.
              </p>
            </div>
          ) : (
            <>
              <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="avatar-zoom">Zoom</Label>
                <input
                  id="avatar-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (imageSrc) URL.revokeObjectURL(imageSrc);
                  setImageSrc(null);
                  setCroppedAreaPixels(null);
                }}
              >
                Choose different image
              </Button>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!imageSrc || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              "Save photo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
