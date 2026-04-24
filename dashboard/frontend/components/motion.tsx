"use client";

import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import { type ReactNode } from "react";

export const MotionDiv = motion.div;
export const MotionSection = motion.section;
export const MotionArticle = motion.article;

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] } },
};

type FadeInProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  delay?: number;
};

export function FadeIn({ children, delay = 0, ...rest }: FadeInProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={fadeUpVariants}
      transition={{ delay, duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  stagger?: number;
};

export function StaggerChildren({ children, stagger = 0.08, ...rest }: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export const staggerItemVariants: Variants = fadeUpVariants;
