import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DEFAULT_FILE =
  'C:\\Users\\vcord\\OneDrive - Futura S.p.A\\Futura Lombardia\\Fatturazione\\Controlli x fatturazione\\2026\\Extra Partesa 2026 + addebiti + cad-hoc.xlsx';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fileArg = args.find((a) => !a.startsWith('--'));
const filePath = fileArg || DEFAULT_FILE;

if (!fs.existsSync(filePath)) {
  console.error('File non trovato:', filePath);
  process.exit(1);
}

async function main() {
  const { importExtraExcelBuffer } = await import('../src/lib/extra-import');
  const buffer = fs.readFileSync(filePath);
  const report = await importExtraExcelBuffer({
    buffer,
    sourceFilename: path.basename(filePath),
    userId: null,
    dryRun,
  });

  const outName = dryRun ? 'extra-import-dry-run-report.json' : 'extra-import-report.json';
  const out = path.join(process.cwd(), outName);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        dryRun: report.dryRun,
        skippedDuplicateBatch: report.skippedDuplicateBatch,
        batchId: report.batchId,
        counts: report.counts,
        issuesFile: out,
        issueLevels: report.issues.reduce(
          (acc, i) => {
            acc[i.level] = (acc[i.level] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
