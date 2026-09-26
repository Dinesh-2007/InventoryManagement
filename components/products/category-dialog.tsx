"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCategory, updateCategory } from "@/actions/categories";

export function CategoryDialog({
  mode,
  category,
}: {
  mode: "create" | "edit";
  category?: { id: string; name: string; description: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  function reset() {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setError(null);
    setNameError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNameError(null);
    startTransition(async () => {
      const input = { name, description };
      const result = mode === "create" ? await createCategory(input) : await updateCategory(category!.id, input);
      if (!result.ok) {
        setError(result.error);
        if (result.fieldErrors?.name) setNameError(result.fieldErrors.name);
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Category created." : "Category updated.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button>
              <Plus /> New Category
            </Button>
          ) : (
            <Button variant="ghost" size="icon-sm" aria-label="Edit category">
              <Pencil className="size-4" />
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Category" : "Edit Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <FieldGroup>
            <Field data-invalid={!!nameError}>
              <FieldLabel htmlFor="cat-name">Name</FieldLabel>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!nameError} required />
              <FieldError errors={nameError ? [{ message: nameError }] : []} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cat-description">Description</FieldLabel>
              <Textarea id="cat-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </Field>
          </FieldGroup>
          {error && !nameError && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
