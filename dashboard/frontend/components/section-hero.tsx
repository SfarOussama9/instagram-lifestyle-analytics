type Props = {
  title: string;
  description: string;
  eyebrow?: string;
};

export function SectionHero({ title, description, eyebrow = "Dashboard section" }: Props) {
  return (
    <div className="relative z-10 max-w-4xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-display mt-4 text-4xl italic tracking-[-0.04em] text-ink sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted">{description}</p>
    </div>
  );
}
