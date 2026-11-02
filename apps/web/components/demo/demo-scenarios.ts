export type DemoRisk = 'context' | 'caution' | 'high';
export interface DemoSegment {
  readonly at: number;
  readonly text: string;
  readonly evidence?: string;
  readonly risk: DemoRisk;
  readonly indicator: string;
  readonly explanation: string;
  readonly recommendation: string;
}
export interface DemoScenario {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly segments: readonly DemoSegment[];
}
export const DEMO_DURATION = 14;

export const demoScenarios: readonly DemoScenario[] = [
  {
    id: 'otp', label: 'Bank OTP', description: 'A fictional caller claims to be from your bank.',
    segments: [
      { at: 0, text: 'Namaste, main aapke bank se bol raha hoon. Ek transaction verify karna hai.', risk: 'context', indicator: 'Awaiting more context', explanation: 'A familiar bank name does not verify a caller’s identity.', recommendation: 'Listen critically. Keep your private codes to yourself.' },
      { at: 4, text: 'Aapka account aaj block ho jayega. Abhi verify karna zaroori hai.', evidence: 'Abhi verify karna zaroori hai.', risk: 'caution', indicator: 'Account threat + urgency', explanation: 'The caller uses an account-blocking threat to pressure an immediate decision.', recommendation: 'Pause. You do not need to respond to pressure on the spot.' },
      { at: 8, text: 'Phone par jo OTP aaya hai, woh mujhe bata dijiye.', evidence: 'OTP aaya hai, woh mujhe bata dijiye.', risk: 'high', indicator: 'Private OTP request', explanation: 'An unverified caller is asking for a private code after creating urgency.', recommendation: 'Do not share your OTP. End the call and contact your bank through its official app or an independently sourced number.' },
    ],
  },
  {
    id: 'kyc', label: 'Fake KYC', description: 'A fictional account-update request becomes a verification trap.',
    segments: [
      { at: 0, text: 'Hello, your account KYC needs an update. I can help complete it today.', risk: 'context', indicator: 'Awaiting more context', explanation: 'An offer to help does not establish the caller’s identity.', recommendation: 'Check any account-update request through an official channel.' },
      { at: 4, text: 'Do this immediately or your account access will be suspended.', evidence: 'immediately or your account access will be suspended', risk: 'caution', indicator: 'Account suspension pressure', explanation: 'The caller threatens loss of access to push you into acting quickly.', recommendation: 'Pause and independently check whether your account needs an update.' },
      { at: 8, text: 'Open the link I send and enter your banking password to finish verification.', evidence: 'enter your banking password', risk: 'high', indicator: 'Credential request via an unsolicited link', explanation: 'The caller directs you to a link and asks for sensitive banking credentials.', recommendation: 'Do not enter your password through the caller’s link. Open your bank’s official app or website independently.' },
    ],
  },
  {
    id: 'arrest', label: 'Digital arrest', description: 'A fictional authority claim uses fear and isolation.',
    segments: [
      { at: 0, text: 'This is an investigation. Your name has appeared in a case.', risk: 'context', indicator: 'Unverified authority claim', explanation: 'The caller’s claim of authority has not been independently checked.', recommendation: 'Do not assume the caller is an official because they sound convincing.' },
      { at: 4, text: 'Stay on this call. Do not tell your family or discuss this with anyone.', evidence: 'Do not tell your family', risk: 'caution', indicator: 'Secrecy and isolation', explanation: 'The caller discourages you from seeking a second opinion.', recommendation: 'Take time to speak to someone you trust and verify the claim independently.' },
      { at: 8, text: 'Transfer money now or you will be arrested today.', evidence: 'Transfer money now or you will be arrested', risk: 'high', indicator: 'Payment demand + arrest threat', explanation: 'A threat of arrest is being used to demand an immediate transfer.', recommendation: 'Do not transfer money under pressure. End the call and independently contact the relevant authority through an official channel.' },
    ],
  },
  {
    id: 'upi', label: 'UPI request', description: 'A fictional refund offer leads to a PIN request.',
    segments: [
      { at: 0, text: 'Aapka refund ready hai. Main payment support se bol raha hoon.', risk: 'context', indicator: 'Unverified refund claim', explanation: 'The refund and the caller’s identity are not verified.', recommendation: 'Check the refund status in the service’s official app.' },
      { at: 4, text: 'Refund abhi approve karo. Yeh request sirf kuch seconds ke liye valid hai.', evidence: 'sirf kuch seconds ke liye valid hai', risk: 'caution', indicator: 'Short deadline pressure', explanation: 'The caller creates a tight deadline to discourage careful checking.', recommendation: 'Do not rush to approve a payment request because of a caller’s deadline.' },
      { at: 8, text: 'Refund receive karne ke liye apna UPI PIN mujhe bata do.', evidence: 'apna UPI PIN mujhe bata do', risk: 'high', indicator: 'Private UPI PIN request', explanation: 'An unverified caller asks you to disclose a sensitive payment PIN.', recommendation: 'Do not share your UPI PIN. Decline the request and independently contact the service’s official support.' },
    ],
  },
];
