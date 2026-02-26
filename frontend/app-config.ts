export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  // agent dispatch configuration
  agentName?: string;

  // LiveKit Cloud Sandbox configuration
  sandboxId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'Elder',
  pageTitle: 'Elder Sales Trainer',
  pageDescription: 'Practice sales conversations with simulated customers',

  logo: '/elder-logo.png',
  accent: '#4A6FA5',
  logoDark: '/elder-logo.png',
  accentDark: '#7B9FD4',
  startButtonText: 'Start training',

  // agent dispatch configuration
  agentName: process.env.AGENT_NAME ?? undefined,

  // LiveKit Cloud Sandbox configuration
  sandboxId: undefined,
};
