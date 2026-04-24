"use client";

import { Camera, Heart, Info, Lightbulb, Users } from "lucide-react";

import { FadeIn, MotionDiv, StaggerChildren, staggerItemVariants } from "../../components/motion";

const TEAM_IMAGES = [
  "/images/Feriel Charrad.jpg",
  "/images/Ines Turki.jpg",
  "/images/Oussama Sfar.png",
  "/images/Yasmine Jedidi.jpg",
];

function getNameFromImagePath(imagePath: string) {
  return imagePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? imagePath;
}

const PROJECT_PILLARS = [
  {
    title: "Why this project",
    body:
      "We wanted a topic that combines social-media behavior with outcomes people actually care about: happiness, stress, engagement, and addiction risk.",
    icon: Lightbulb,
    tint: "#F58529",
  },
  {
    title: "Why Instagram",
    body:
      "The dataset is scoped to Instagram users only, so the visuals and narrative stay centered on Instagram habits, creator behavior, doomscrolling, and wellbeing patterns.",
    icon: Camera,
    tint: "#DD2A7B",
  },
  {
    title: "What we built",
    body:
      "An interactive dashboard for exploratory analysis, persona discovery, predictive modeling, and live scoring of Instagram user profiles.",
    icon: Info,
    tint: "#8134AF",
  },
  {
    title: "How to read it",
    body:
      "This is a synthetic dataset, so the app is designed to be informative without overstating causality. The goal is explanation, not hype.",
    icon: Heart,
    tint: "#2E7D5B",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-full space-y-10 overflow-x-hidden">
      <FadeIn>
        <div className="surface-panel overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.15fr,1fr]">
            <div className="px-6 py-8 sm:px-10 sm:py-11">
              <p className="eyebrow">About us</p>
              <h1 className="mt-4 font-display text-4xl italic leading-[1.05] tracking-[-0.04em] text-ink sm:text-[3.1rem]">
                The team behind this <span className="ig-gradient-text">Instagram wellbeing dashboard</span>.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
                This project was built by senior software engineering students who wanted to turn an Instagram-focused behavioral dataset into a clearer, more human analytics experience. We centered the work on happiness, stress, engagement, and addiction-risk because those outcomes make the data meaningful beyond raw usage counts.
              </p>
              <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-[rgba(221,42,123,0.15)] bg-[rgba(221,42,123,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#B02566]">
                <Users className="h-3.5 w-3.5" />
                4 senior software engineering students
              </div>
            </div>

            <div className="relative min-h-[260px] overflow-hidden lg:min-h-[360px]">
              <img
                src="/images/cool-teen-young-woman-pink-hoodie-stylish-sunglasses-takes-selfie-holds-phone-poses-with-headphones-outside.jpg"
                alt="Instagram lifestyle visual"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(129,52,175,0.58)] via-[rgba(221,42,123,0.35)] to-[rgba(245,133,41,0.22)] mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/25 to-transparent lg:from-white lg:via-white/10" />
            </div>
          </div>
        </div>
      </FadeIn>

      <StaggerChildren className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" stagger={0.08}>
        {PROJECT_PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <MotionDiv key={pillar.title} variants={staggerItemVariants} className="surface-panel p-6">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${pillar.tint}18`, color: pillar.tint }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-ink">{pillar.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{pillar.body}</p>
            </MotionDiv>
          );
        })}
      </StaggerChildren>

      <FadeIn>
        <div className="surface-panel p-7 sm:p-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Team</p>
              <h2 className="mt-3 font-display text-3xl italic tracking-[-0.03em] text-ink sm:text-4xl">
                Meet the <span className="ig-gradient-text">project team</span>
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                The member names shown below are taken directly from the image filenames in the project images folder.
              </p>
            </div>
          </div>

          <StaggerChildren className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4" stagger={0.08}>
            {TEAM_IMAGES.map((image) => {
              const name = getNameFromImagePath(image);

              return (
              <MotionDiv key={name} variants={staggerItemVariants} className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_10px_32px_-22px_rgba(17,17,27,0.18)]">
                <div className="relative aspect-[4/5] overflow-hidden bg-[rgba(17,17,27,0.04)]">
                  <img src={image} alt={name} className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                <div className="p-5">
                  <p className="font-display text-xl italic tracking-tight text-ink">{name}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted">Senior software engineering student</p>
                </div>
              </MotionDiv>
            );})}
          </StaggerChildren>
        </div>
      </FadeIn>
    </div>
  );
}