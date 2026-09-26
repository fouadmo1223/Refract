import { useCallback, useReducer } from 'react'

const LIMIT = 50

function reducer(state, action) {
  switch (action.type) {
    case 'set': {
      // Live changes replace the present without creating a history entry.
      return { ...state, present: action.value }
    }
    case 'commit': {
      const value = action.value ?? state.present
      if (state.committed === value) return state
      return {
        past: [...state.past, state.committed].slice(-LIMIT),
        present: value,
        committed: value,
        future: [],
      }
    }
    case 'undo': {
      if (!state.past.length) return state
      const previous = state.past[state.past.length - 1]
      return { past: state.past.slice(0, -1), present: previous, committed: previous, future: [state.committed, ...state.future] }
    }
    case 'redo': {
      if (!state.future.length) return state
      const [next, ...rest] = state.future
      return { past: [...state.past, state.committed], present: next, committed: next, future: rest }
    }
    case 'reset':
      return { past: [], present: action.value, committed: action.value, future: [] }
    default:
      return state
  }
}

/**
 * Undo/redo state. `set` updates the live value (e.g. while dragging a slider),
 * `commit` records a history step (e.g. on slider release).
 */
export function useHistoryState(initialValue) {
  const [state, dispatch] = useReducer(reducer, { past: [], present: initialValue, committed: initialValue, future: [] })

  return {
    value: state.present,
    set: useCallback((value) => dispatch({ type: 'set', value }), []),
    commit: useCallback((value) => dispatch({ type: 'commit', value }), []),
    undo: useCallback(() => dispatch({ type: 'undo' }), []),
    redo: useCallback(() => dispatch({ type: 'redo' }), []),
    reset: useCallback((value) => dispatch({ type: 'reset', value }), []),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}
