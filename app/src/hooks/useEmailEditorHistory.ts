import { useCallback, useReducer, type SetStateAction } from 'react';

interface HistoryState<T> {
  present: T;
  checkpoint: T;
  past: T[];
  future: T[];
}

type HistoryAction<T> =
  | { type: 'edit'; update: SetStateAction<T> }
  | { type: 'commit'; value?: T }
  | { type: 'reset'; value: T }
  | { type: 'undo' }
  | { type: 'redo' };

function clone<T>(value: T): T {
  return structuredClone(value);
}

function reducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
  if (action.type === 'edit') {
    const present = typeof action.update === 'function'
      ? (action.update as (previous: T) => T)(state.present)
      : action.update;
    return { ...state, present };
  }
  if (action.type === 'commit') {
    const present = clone(action.value ?? state.present);
    if (JSON.stringify(present) === JSON.stringify(state.checkpoint)) return { ...state, present };
    return { present, checkpoint: present, past: [...state.past, clone(state.checkpoint)].slice(-80), future: [] };
  }
  if (action.type === 'reset') {
    const value = clone(action.value);
    return { present: value, checkpoint: value, past: [], future: [] };
  }
  if (action.type === 'undo') {
    const previous = state.past.at(-1);
    if (!previous) return state;
    const value = clone(previous);
    return { present: value, checkpoint: value, past: state.past.slice(0, -1), future: [clone(state.checkpoint), ...state.future] };
  }
  const next = state.future[0];
  if (!next) return state;
  const value = clone(next);
  return { present: value, checkpoint: value, past: [...state.past, clone(state.checkpoint)], future: state.future.slice(1) };
}

export function useEmailEditorHistory<T>(initialValue: T) {
  const initial = clone(initialValue);
  const [state, dispatch] = useReducer(reducer<T>, { present: initial, checkpoint: initial, past: [], future: [] });
  const setValue = useCallback((update: SetStateAction<T>) => dispatch({ type: 'edit', update }), []);
  const commit = useCallback((value?: T) => dispatch({ type: 'commit', value }), []);
  const reset = useCallback((value: T) => dispatch({ type: 'reset', value }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  return { value: state.present, setValue, commit, reset, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}
