import { describe, it, expect } from "vitest";

type Snapshot = {
  mrr: number;
  newMrr: number;
  churnedMrr: number;
  expansionMrr: number;
  activeUsers: number;
  trialUsers: number;
};

function summarizeSnapshots(snapshots: Snapshot[]) {
  const latest = snapshots[snapshots.length - 1];
  const earliest = snapshots[0];

  const totalNewMrr = snapshots.reduce((sum, row) => sum + row.newMrr, 0);
  const totalChurnedMrr = snapshots.reduce((sum, row) => sum + row.churnedMrr, 0);
  const totalExpansionMrr = snapshots.reduce((sum, row) => sum + row.expansionMrr, 0);

  const avgChurnRate =
    earliest.mrr > 0 ? ((totalChurnedMrr / snapshots.length / earliest.mrr) * 100 * 30).toFixed(2) : "0.00";

  const mrrGrowth =
    earliest.mrr > 0 ? (((latest.mrr - earliest.mrr) / earliest.mrr) * 100).toFixed(1) : "0.0";

  return {
    currentMrr: latest.mrr,
    currentArr: latest.mrr * 12,
    activeUsers: latest.activeUsers,
    trialUsers: latest.trialUsers,
    mrrGrowthPct: parseFloat(mrrGrowth),
    avgMonthlyChurnRatePct: parseFloat(avgChurnRate),
    totalNewMrr,
    totalChurnedMrr,
    totalExpansionMrr,
    netNewMrr: totalNewMrr - totalChurnedMrr + totalExpansionMrr,
  };
}

describe("metrics transformation integration", () => {
  it("computes dashboard summary correctly from snapshot rows", () => {
    const snapshots: Snapshot[] = [
      {
        mrr: 10000,
        newMrr: 500,
        churnedMrr: 200,
        expansionMrr: 120,
        activeUsers: 300,
        trialUsers: 40,
      },
      {
        mrr: 10400,
        newMrr: 600,
        churnedMrr: 250,
        expansionMrr: 150,
        activeUsers: 307,
        trialUsers: 43,
      },
    ];

    const summary = summarizeSnapshots(snapshots);

    expect(summary.currentMrr).toBe(10400);
    expect(summary.currentArr).toBe(124800);
    expect(summary.totalNewMrr).toBe(1100);
    expect(summary.totalChurnedMrr).toBe(450);
    expect(summary.totalExpansionMrr).toBe(270);
    expect(summary.netNewMrr).toBe(920);
    expect(summary.activeUsers).toBe(307);
    expect(summary.trialUsers).toBe(43);
    expect(summary.mrrGrowthPct).toBeCloseTo(4.0, 1);
  });
});
