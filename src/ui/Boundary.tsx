import React from 'react';

import { CrashScreen } from '../screens/CrashScreen';
import { storage } from '../storage/store';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  /** Bumped on every way out, so what is inside starts again from nothing. */
  generation: number;
}

/**
 * The one error boundary in the app, around everything the player can reach.
 *
 * React only offers this as a class, which is why there is one here. It does
 * two things: catches a throw from anywhere below it and shows `CrashScreen`
 * instead of nothing, and starts the tree over when the player takes one of
 * that screen's two ways out. Starting over is a change of `key` rather than a
 * re-render — the shell and every hook in it are unmounted and mounted again,
 * so whatever state it had built up to the throw is gone with it, and the
 * saved game is read back from disk rather than remembered.
 *
 * Discarding the saved game goes to storage directly. The hook that usually
 * owns it lives inside the tree that just failed, and a boundary that reached
 * back into the thing it caught would be trusting exactly what it should not.
 */
export class Boundary extends React.Component<Props, State> {
  state: State = { error: null, generation: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  private restart = () => {
    this.setState((state) => ({ error: null, generation: state.generation + 1 }));
  };

  private discard = () => {
    // The store swallows a write that fails, so this always resolves — and the
    // restart waits for it, so the shell reads the cleared slot rather than
    // racing the removal.
    void storage.clearSavedGame().then(this.restart, this.restart);
  };

  render() {
    const { error, generation } = this.state;
    if (error) return <CrashScreen error={error} onHome={this.restart} onDiscard={this.discard} />;
    return <React.Fragment key={generation}>{this.props.children}</React.Fragment>;
  }
}
