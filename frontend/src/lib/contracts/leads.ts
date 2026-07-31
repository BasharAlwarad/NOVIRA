export interface PathFitEntry {
  pathLabel: string;
  fitLabel: string;
  barPercent: number;
  highlighted: boolean;
}

export interface SaveResultRequest {
  email: string;
  verdictHeading: string;
  verdictBody: string;
  adviceFactorLabel: string | null;
  adviceText: string | null;
  pathFit: PathFitEntry[];
  documentChecklist: string[];
  continueUrl: string;
}

export interface SaveResultResponse {
  saved: boolean;
  emailSent: boolean;
}
