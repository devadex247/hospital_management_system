export type TriageRiskLevel = "Low Risk" | "Moderate Risk" | "High Risk" | "Critical";

export type TriageVitals = {
  heartRate: number;
  spo2: number;
  temperature: number;
};

export type TriageAssessment = {
  mewsScore: number;
  riskLevel: TriageRiskLevel;
  probability: number;
  recommendation: string;
  observations: string[];
};

const RECOMMENDATIONS: Record<TriageRiskLevel, string> = {
  "Low Risk": "Continue routine monitoring. Re-assess vitals in 4 hours and document any symptom changes.",
  "Moderate Risk": "Increase monitoring frequency to every 2 hours and notify the attending physician.",
  "High Risk": "Immediate physician assessment is required. Prepare step-up care and repeat vitals promptly.",
  Critical: "Emergency escalation required. Alert a senior clinician immediately and prepare the ICU or resuscitation pathway.",
};

export function calculateMEWS({ heartRate, spo2, temperature }: TriageVitals) {
  let score = 0;

  if (heartRate < 40 || heartRate > 130) {
    score += 3;
  } else if (heartRate < 50 || heartRate > 110) {
    score += 2;
  } else if (heartRate < 60 || heartRate > 100) {
    score += 1;
  }

  if (spo2 < 85) {
    score += 3;
  } else if (spo2 < 90) {
    score += 2;
  } else if (spo2 < 95) {
    score += 1;
  }

  if (temperature < 35 || temperature > 40) {
    score += 2;
  } else if (temperature < 36 || temperature > 38.5) {
    score += 1;
  }

  return score;
}

export function getMEWSRisk(score: number): TriageRiskLevel {
  if (score <= 2) {
    return "Low Risk";
  }

  if (score <= 4) {
    return "Moderate Risk";
  }

  if (score <= 6) {
    return "High Risk";
  }

  return "Critical";
}

export function assessTriage(vitals: TriageVitals): TriageAssessment {
  const mewsScore = calculateMEWS(vitals);
  const riskLevel = getMEWSRisk(mewsScore);

  return {
    mewsScore,
    riskLevel,
    probability: Math.min(0.95, mewsScore / 12),
    recommendation: RECOMMENDATIONS[riskLevel],
    observations: getObservations(vitals),
  };
}

export function isValidTriageVitals(vitals: Partial<TriageVitals>): vitals is TriageVitals {
  return (
    isFiniteNumber(vitals.heartRate) &&
    isFiniteNumber(vitals.spo2) &&
    isFiniteNumber(vitals.temperature) &&
    vitals.heartRate >= 25 &&
    vitals.heartRate <= 220 &&
    vitals.spo2 >= 50 &&
    vitals.spo2 <= 100 &&
    vitals.temperature >= 30 &&
    vitals.temperature <= 45
  );
}

function getObservations({ heartRate, spo2, temperature }: TriageVitals) {
  const observations: string[] = [];

  if (heartRate > 110) {
    observations.push("Tachycardia is contributing to the risk score.");
  } else if (heartRate < 50) {
    observations.push("Bradycardia is contributing to the risk score.");
  }

  if (spo2 < 95) {
    observations.push("Oxygen saturation is below the usual ward observation range.");
  }

  if (temperature > 38.5) {
    observations.push("Fever is present and should be reviewed against infection markers.");
  } else if (temperature < 36) {
    observations.push("Low body temperature is present and may need urgent review.");
  }

  if (observations.length === 0) {
    observations.push("Entered vitals are within the low-risk scoring range.");
  }

  return observations;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
