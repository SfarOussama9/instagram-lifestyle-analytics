import { SectionHero } from "../../components/section-hero";
import { UploadLab } from "../../components/upload-lab";

export default function AutomlPage() {
  return (
    <div className="section-stack">
      <div className="shell-panel relative overflow-hidden p-8 sm:p-10">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(100,181,205,0.18),transparent_62%)]" />
        <SectionHero
          eyebrow="Upload workflow"
          title="Batch Scoring Command Center"
          description="Score project-ready Instagram datasets with the trained pipeline, inspect persona and outcome distributions, and fall back to custom-target modeling when you want to experiment with encoded or standardized feature matrices. Upload results stay isolated to this page and do not overwrite the main dashboard EDA, personas, or model views."
        />
      </div>
      <UploadLab />
    </div>
  );
}
