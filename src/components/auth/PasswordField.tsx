"use client";

import { forwardRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Field } from "./Field";

type PasswordFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
  label?: string;
  error?: string | null;
  success?: boolean;
  hint?: string;
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label = "Senha", ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <Field
        ref={ref}
        label={label}
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        {...props}
        rightSlot={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={visible ? "on" : "off"}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                className="inline-flex"
              >
                {visible ? (
                  <EyeOff className="h-4 w-4" strokeWidth={2.2} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={2.2} />
                )}
              </motion.span>
            </AnimatePresence>
          </button>
        }
      />
    );
  },
);
