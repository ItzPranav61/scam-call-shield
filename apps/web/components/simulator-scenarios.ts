export const simulatorScenarios = [
  {
    id: 'bank', label: 'Bank / KYC', caller: 'An unverified “bank representative”',
    introduction: 'Hello, I’m calling from your bank. Your KYC details need to be updated today.',
    demand: 'Your account will be blocked. Share the OTP sent to your phone so I can verify it right away.',
    flags: ['Request for a private OTP', 'Account-blocking threat', 'Pressure to act immediately'],
    unsafeAction: 'Share the OTP', safeAction: 'End the call and verify independently',
    unsafeFeedback: 'Sharing a private code with an unverified caller can give them access you did not intend. The account-blocking threat is a reason to pause, not a reason to share it.',
    safeFeedback: 'Ending the call creates space to check the claim. Open your bank’s official app or find its contact number independently. Keep your OTP private.',
    verification: 'Use your bank’s official app or an independently sourced contact number.',
  },
  {
    id: 'arrest', label: 'Fake arrest', caller: 'An unverified “investigating officer”',
    introduction: 'This is an investigation. Your name has appeared in a case and you must cooperate with me now.',
    demand: 'Transfer money immediately to avoid arrest. Stay on the line and do not discuss this with anyone.',
    flags: ['Threat of arrest', 'Immediate payment demand', 'Secrecy and isolation'],
    unsafeAction: 'Agree to transfer money', safeAction: 'End the call and check the claim',
    unsafeFeedback: 'A payment made under pressure can put your money at risk. A threat and a demand for secrecy do not verify that the caller is an authority.',
    safeFeedback: 'Pause, do not transfer money under pressure, and independently contact the relevant authority through an official channel. Speak to someone you trust.',
    verification: 'Find an official contact channel yourself and speak to someone you trust.',
  },
  {
    id: 'access', label: 'Remote access', caller: 'An unverified “support agent”',
    introduction: 'I’m from payment support. I can fix the transaction issue on your phone for you.',
    demand: 'Install this screen-sharing app, give me control and open your banking app while we stay on the call.',
    flags: ['Unsolicited device-access request', 'Banking during screen sharing', 'Unverified support identity'],
    unsafeAction: 'Allow remote access', safeAction: 'Decline and use official support',
    unsafeFeedback: 'Granting control of your device to an unverified caller can expose sensitive information. The offer to help does not establish their identity.',
    safeFeedback: 'Decline the access request and end the call. Find support through the service’s official app or website. Keep banking sessions away from screen sharing.',
    verification: 'Use the service’s official app or website to find support independently.',
  },
] as const;

export type SimulatorScenario = typeof simulatorScenarios[number];
