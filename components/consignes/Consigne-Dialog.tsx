"use client";

import ConsigneForm from "./ConsigneForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  setOpen: (value: boolean) => void;
  children: React.ReactNode;
};

export default function ConsigneDialog({ open, setOpen, children }: Props) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#0078b8] hover:bg-[#00649a]">
          + Nouvelle consigne
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nouvelle consigne</DialogTitle>
        </DialogHeader>

        {children}
      </DialogContent>
    </Dialog>
  );
}