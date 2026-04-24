import { PredictConsole } from "../../components/predict-console";
import { SectionHero } from "../../components/section-hero";

export default function PredictPage() {
  return (
    <div className="space-y-6">
      <div className="surface-panel p-8">
        <SectionHero title="Live Predict" description="Score a synthetic user profile live, surface all target outputs together, and see where the profile lands in the persona system." eyebrow="Prediction" />
      </div>
      <PredictConsole />
    </div>
  );
}
