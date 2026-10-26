export const APPEAL_VERDICTS = [
  'Appeal reviewed. Reviewer: the House. Outcome: denied.',
  'Your appeal was received, stamped, and declined.',
  'Rule 0.4(b) covers this exactly. Denied.',
  'The incident did not take place. Your appeal is therefore denied.',
  'Denied. Please lose with more composure next time.',
  'Reviewed by the House Department of Scoring. Denied, unanimously.',
  'Your appeal is in the pile. The pile has reviewed it. The pile says no.',
  'Denied. The House has not lost an appeal since records began, which was yesterday.',
  'Appeal denied on procedural grounds. We are still deciding which grounds.',
  'We take appeals seriously. We also take them, and put them in the bin.',
];

export const FAIR_PLAY_LINES = [
  'Certified fair by the House Fairness Commission.',
  'Every move reviewed. Ours are the reviewed ones.',
  'Integrity guaranteed or your rating back.',
];

export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
