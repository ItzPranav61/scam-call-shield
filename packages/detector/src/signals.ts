import { DETECTOR_CONFIG } from './rules.js';
import { normalizedClauses } from './normalize.js';
import type { SignalGroup } from './types.js';

// Anchored token patterns prevent matching words such as "topic" or "transferability".
const SECRET = /^(?:otp|pin|cvv|password|passcode|ओटीपी|ओटिपी|पिन|सीवीवी|पासवर्ड)$/u;
const REQUEST = /^(?:share|send|give|tell|provide|reveal|enter|read|ask|asks|bata|bataaen|batao|bataiye|bataye|batayein|batana|boliye|bolo|bhejo|bhejiye|chahiye|mangta|maangta|बताओ|बताइए|बताएं|बताना|बोलो|दीजिए|भेजें|भेजो|मांगता|माँगता|सांगा|सांगू|द्या|पाठवा)$/u;
const NEGATIVE = /^(?:never|not|no|cannot|mat|nahi|nahin|मत|मैट|नहीं|नहि|नका|नाही|नको)$/u;
const AUTHORITY = /^(?:police|cbi|ed|rbi|trai|bank|customs|officer|अधिकारी|पुलिस|पोलीस|सीबीआई|आरबीआई|ट्राई|बैंक|बँक|कस्टम)$/u;
const CLAIM = /(?:^| )(?:main|mein|hum|i am|we are|from|officer|official|bol raha hoon|bol rahi hoon|मैं|हम|मी|अधिकारी)(?: |$)/u;
const LAW_ENFORCEMENT = /^(?:police|cbi|ed|customs|officer|पुलिस|पोलीस|सीबीआई|अधिकारी)$/u;
const ARREST = /^(?:arrest|arrested|atak|jail|गिरफ्तार|गिरफ़्तार|गिरफ्तारी|अटक|जेल)$/u;
const BLOCK = /^(?:block|blocked|band|बंद|ब्लॉक)$/u;
const URGENT = /^(?:abhi|turant|immediately|urgent|अभी|तुरंत|तुरन्त|ताबडतोब|लगेच)$/u;
const MONEY = /^(?:upi|money|paise|paisa|payment|fee|fees|refund|पैसे|पैसा|रक्कम|शुल्क|फी|यूपीआई|रुपये)$/u;
const MONEY_ACTION = /^(?:transfer|pay|send|bhejo|bhejiye|bharo|bhejne|accept|ट्रांसफर|भेजो|भेजें|भरा|पाठवा|पाठवणे|भरणा)$/u;
const REMOTE = /^(?:anydesk|teamviewer|apk|link|app|remote|अन्यडेस्क|एनीडेस्क|टीमव्यूअर|एपीके|लिंक|ऐप|अ‍ॅप|अॅप)$/u;
const REMOTE_ACTION = /^(?:install|download|click|open|enable|allow|इंस्टॉल|इन्स्टॉल|डाउनलोड|क्लिक|खोलो|उघडा)$/u;

function near(words: readonly string[], index: number, pattern: RegExp): boolean {
  const width = DETECTOR_CONFIG.requestWindowTokens;
  return words.slice(Math.max(0, index - width), index + width + 1).some((word) => pattern.test(word));
}
function negated(words: readonly string[], index: number): boolean {
  const { negationBeforeTokens: before, negationAfterTokens: after } = DETECTOR_CONFIG;
  if (words.slice(Math.max(0, index - before), index + after + 1).some((word) => NEGATIVE.test(word))) return true;
  const following = words.slice(index + 1, index + DETECTOR_CONFIG.requestWindowTokens + 1).join(' ');
  if (/^(?:ki zarurat nahi|की जरूरत नहीं|की ज़रूरत नहीं|करण्याची गरज नाही)(?: |$)/u.test(following)) return true;
  // Protective "never ask you to transfer..." scopes over its following action.
  return /(?:never|not) (?:ask|asks|request)(?: |$)/u.test(
    words.slice(Math.max(0, index - DETECTOR_CONFIG.requestWindowTokens), index).join(' '));
}
function requestFor(words: readonly string[], noun: RegExp, action: RegExp): boolean {
  return words.some((word, index) => action.test(word) && !negated(words, index) && near(words, index, noun));
}

// Keep polite handover requests separate from existing direct commands; negation still
// scopes over the action token and acronym normalization is shared with all signals.
function politeRequest(words: readonly string[], index: number): boolean {
  return /^(?:(?:de|bata|bataa) sakte ho|de dijiye|bhej do)(?: |$)/u.test(words.slice(index).join(' '));
}

export function findSignals(segment: string, lawEnforcementContext = false): { groups: SignalGroup[]; arrestThreat: boolean; lawEnforcementContext: boolean; directSensitiveRequest: boolean } {
  const found = new Set<SignalGroup>();
  let arrestThreat = false;
  let directSensitiveRequest = false;
  for (const clause of normalizedClauses(segment)) {
    const words = clause.split(' ');
    // Conditional non-payment is pressure, not a negation of the following threat.
    // Scope only this observed construction; ordinary "payment nahi karna" stays negated.
    const paymentCondition = /(?:^| )payment (?:nahi|nahin) kiya (?:toh|to)(?: |$)/u.exec(clause);
    const consequence = paymentCondition
      ? clause.slice(paymentCondition.index + paymentCondition[0].length).trim() : clause;
    const threatWords = consequence.split(' ');
    if (paymentCondition) { found.add('money'); found.add('urgency'); }
    const cyberCrime = /(?:^| )cyber crime(?: |$)/u.test(clause)
      && words.some((word, index) => word === 'cyber' && !negated(words, index));
    for (const [index, word] of words.entries()) {
      if (negated(words, index) || !near(words, index, SECRET)) continue;
      const polite = politeRequest(words, index);
      if (polite || REQUEST.test(word)) {
        found.add('sensitive');
        if (!polite) directSensitiveRequest = true;
      }
    }

    lawEnforcementContext ||= cyberCrime || words.some((word, index) => LAW_ENFORCEMENT.test(word) && !negated(words, index));
    // Only the observed threat phrases qualify as a misheard arrest, never a bare rest token.
    const misheardRest = lawEnforcementContext && words.some((word, index) => {
      if (word !== 'rest' || negated(words, index)) return false;
      const end = words[index + 1] === 'karenge' ? index + 1
        : words[index + 1] === 'kar' && words[index + 2] === 'denge' ? index + 2 : undefined;
      return end !== undefined && !negated(words, end);
    });
    const arrest = misheardRest || threatWords.some((word, index) => ARREST.test(word) && !negated(threatWords, index));
    // Named legal consequences only: a bare mention of "case" is not a threat.
    const legalThreat = /(?:^| )aapke (?:khilaf warrant|naam (?:par|per) (?:ek )?case(?: darj)?) hai(?: |$)/u.test(consequence);
    if (arrest && lawEnforcementContext) found.add('authority');
    const block = words.some((word, index) => BLOCK.test(word) && !negated(words, index)
      && near(words, index, /^(?:account|sim|खाता|खाते|सिम)$/u));
    const pending = words.some((word, index) => /^(?:pending|पेंडिंग|बाकी)$/u.test(word)
      && !negated(words, index) && near(words, index, /^(?:kyc|केवाईसी)$/u));
    const urgent = words.some((word, index) => URGENT.test(word) && !negated(words, index));
    if (arrest || legalThreat || block || pending || urgent) found.add('urgency');
    arrestThreat ||= arrest || legalThreat;

    if (CLAIM.test(clause) && (cyberCrime || words.some((word, index) => AUTHORITY.test(word) && !negated(words, index)))) {
      found.add('authority');
    }
    if (words.some((word, index) => MONEY_ACTION.test(word) && !negated(words, index)
      && (/^(?:transfer|pay|ट्रांसफर)$/u.test(word) || near(words, index, MONEY)))) found.add('money');
    if (requestFor(words, REMOTE, REMOTE_ACTION)) found.add('remote');

    const family = /(?:^| )(?:family|ghar|परिवार|घरवालों|कुटुंबाला|कुटुंब|घरच्यांना)(?: |$)/u.test(clause);
    const hide = /(?:do not tell|dont tell|not tell|mat batana|मत बताना|मत बताइए|सांगू नका)/u.test(clause);
    const stay = words.some((word, index) => /^(?:stay|raho|रहो|रहा)$/u.test(word)
      && !negated(words, index) && near(words, index, /^(?:line|call|कॉलवर|कॉल|लाइन)$/u));
    if ((family && hide && !words.some((word) => SECRET.test(word))) || stay) found.add('secrecy');
  }
  return { groups: [...found], arrestThreat, lawEnforcementContext, directSensitiveRequest };
}
