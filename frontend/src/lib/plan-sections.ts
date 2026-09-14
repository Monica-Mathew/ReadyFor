export type PlanSection = { title: string; body: string; warning: boolean };
const warningLine = /^\*\*Not verified from the retrieved source[^\n]*\*\*\s*$/i;
const knownHeading = /^(WEATHER(?: & WHAT TO WEAR)?|BRING|BEFORE YOU GO|LEAVE BY|YOUR ROUTE|APPOINTMENT & ARRIVAL|DETAILS TO CONFIRM|SOME DETAILS NEED CONFIRMATION|PREPARATION STEPS|SOURCES READ|RESEARCH SOURCES)$/i;
export function arrangePlan(text: string): PlanSection[] {
  const sections: PlanSection[] = [];
  let current: PlanSection = { title: 'Overview', body: '', warning: false };
  let pendingWarning = false;
  let fence = false;
  const push = () => { if (current.body.trim()) sections.push({ ...current, body: current.body.trim() }); };
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) fence = !fence;
    if (!fence && warningLine.test(line.trim())) { pendingWarning = true; continue; }
    const cleaned = line.trim().replace(/\*\*/g, '').replace(/:$/, '');
    const heading = !fence && (line.match(/^#{1,6}\s+(.+?)\s*#*$/)?.[1] ||
      (knownHeading.test(cleaned) ? cleaned : null) ||
      line.match(/^\d+[.)]\s+\*\*(.+?)\*\*\s*:?\s*$/)?.[1]);
    if (heading) {
      if (!current.body.trim() && current.warning) pendingWarning = true;
      push();
      current = { title: heading.replace(/\*\*/g, '').replace(/:$/, '').trim(), body: '', warning: pendingWarning };
      pendingWarning = false;
    } else {
      if (pendingWarning && line.trim()) { current.warning = true; pendingWarning = false; }
      current.body += line + '\n';
    }
  }
  push();
  if (pendingWarning && sections.length) sections[sections.length - 1].warning = true;
  return sections;
}
