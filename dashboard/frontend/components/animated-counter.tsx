"use client";

import { animate, useInView, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

type Props = {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
};

export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 1.4,
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) =>
    `${prefix}${latest.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`
  );

  useEffect(() => {
    if (inView) {
      const controls = animate(motionValue, value, {
        duration,
        ease: [0.22, 0.61, 0.36, 1],
      });
      return () => controls.stop();
    }
  }, [inView, motionValue, value, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const unsubscribe = rounded.on("change", (latest) => {
      el.textContent = latest;
    });
    return unsubscribe;
  }, [rounded]);

  return (
    <span ref={ref} className={className}>
      {`${prefix}${(0).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`}
    </span>
  );
}
