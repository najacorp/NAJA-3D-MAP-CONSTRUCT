// SPDX-License-Identifier: GPL-3.0-only
export interface Command { undo(): void; redo(): void }
export class History {
  private past: Command[] = [];
  private future: Command[] = [];
  constructor(private changed: () => void) {}
  execute(command: Command) { command.redo(); this.record(command); }
  record(command: Command) { this.past.push(command); this.future = []; this.changed(); }
  undo() { const command = this.past.pop(); if (command) { command.undo(); this.future.push(command); this.changed(); } }
  redo() { const command = this.future.pop(); if (command) { command.redo(); this.past.push(command); this.changed(); } }
  clear() { this.past = []; this.future = []; this.changed(); }
}
export function snap(value: number, step: number): number { return step > 0 ? Math.round(value / step) * step : value; }
