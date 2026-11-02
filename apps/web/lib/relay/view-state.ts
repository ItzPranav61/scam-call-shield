import { initialLiveState, type LiveState } from './client';

export interface LiveViewState { session: LiveState; consent: boolean }
export type LiveViewAction = { type: 'consent'; checked: boolean } | { type: 'session'; session: LiveState };
export const initialLiveView: LiveViewState = { session: initialLiveState, consent: false };

/** Consent belongs to the current user-started session, never a saved preference. */
export function liveViewReducer(state: LiveViewState, action: LiveViewAction): LiveViewState {
  if (action.type === 'consent') return { ...state, consent: action.checked };
  const terminal = ['ended', 'error', 'relay-offline'].includes(action.session.phase);
  return { session: action.session, consent: terminal ? false : state.consent };
}

export function canStart(view: LiveViewState): boolean {
  return view.consent && !['connecting', 'listening'].includes(view.session.phase);
}
