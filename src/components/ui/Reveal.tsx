"use client";

import { motion, type Variants } from "framer-motion";
import { fadeUp } from "@/lib/motion";

type RevealProps = {
  children: React.ReactNode;
  variants?: Variants;
  delay?: number;
  className?: string;
  once?: boolean;
  amount?: number;
};

export function Reveal({
  children,
  variants = fadeUp,
  delay = 0,
  className,
  once = true,
  amount = 0.25,
}: RevealProps) {
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      custom={delay}
    >
      {children}
    </motion.div>
  );
}
