"use client";
import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal } from "../ui/kit/Modal";
import { Button } from "../ui/kit/Button";

type ModalApi = {
  confirm: (opts: { title: string; body: string; okText?: string; cancelText?: string }) => Promise<boolean>;
  open: (node: React.ReactNode, title?: string) => void;
  close: () => void;
};

const Ctx = createContext<ModalApi | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [body, setBody] = useState<React.ReactNode>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const api = useMemo<ModalApi>(() => {
    return {
      confirm: ({ title, body, okText = "Confirm", cancelText = "Cancel" }) =>
        new Promise<boolean>((resolve) => {
          setTitle(title);
          setBody(
            <div className="space-y-4">
              <div>{body}</div>
              <div className="hidden" />
            </div>
          );
          setResolver(() => resolve);
          setOpen(true);

          // Footer is handled below using resolver state
        }),
      open: (node, title) => {
        setTitle(title);
        setBody(node);
        setResolver(null);
        setOpen(true);
      },
      close: () => {
        setOpen(false);
        setResolver(null);
      },
    };
  }, []);

  const close = () => {
    setOpen(false);
    if (resolver) resolver(false);
    setResolver(null);
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <Modal
        open={open}
        title={title}
        onClose={close}
        footer={
          resolver ? (
            <>
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button
                onClick={() => {
                  setOpen(false);
                  resolver(true);
                  setResolver(null);
                }}
              >
                Confirm
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={close}>Close</Button>
          )
        }
      >
        {body}
      </Modal>
    </Ctx.Provider>
  );
}

export function useModal() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useModal must be used within ModalProvider");
  return v;
}