import { auditFloors } from "../src/game/floorAudit.ts";
import { FLOORS } from "../src/game/floors.ts";

const reports = auditFloors(FLOORS);
console.table(reports.map(({ issues, ...report }) => ({ ...report, problems: issues.length })));

const failures = reports.flatMap((report) => report.issues.map((issue) => `F${report.floor}: ${issue}`));
if (failures.length > 0) {
  console.error(`Floor topology audit found ${failures.length} problem(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  throw new Error("Floor topology audit failed");
}

console.log(`Floor topology audit: PASS (${reports.length} floors).`);
