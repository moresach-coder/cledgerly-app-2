# Ledgerly

Personal financial verification workspace. Local-first: SQLite file on your
disk, nothing hosted, nothing sent anywhere.

## Run it

    npm install
    npm run dev

Open http://localhost:3000. The database is created automatically at
`data/ledgerly.db` on first run. `data/` is gitignored — if you push this to
GitHub, your actual transactions never go with it.

## What's here (v1)

- **Review workspace** (`/`) — import statement text, review each transaction:
  Accept, Change, Mark unknown, Defer. Corrections are remembered as rules and
  auto-applied to matching pending transactions.
- **Reconciliation** — every import can be checked against the statement's
  own declared debit total. If the parsed total doesn't match, you get an
  explicit warning with the gap amount, not a silent discrepancy.
- **Duplicate detection** — keyed off the original statement line, not the
  editable merchant name, so renaming a merchant doesn't break re-import
  detection.
- **Summary** (`/summary`) — verified vs. still-provisional expense totals,
  breakdown by transaction type and category, recurring payments detected
  across 3+ months of verified data.

All 14 transaction types from the spec are supported: personal/business
expense, income, investment, own/family transfer, credit-card payment,
EMI/loan payment, loan given/repaid, reimbursement expected/received, refund,
cash, unclassified.

## Import format

Paste one transaction per line, any statement or SMS shape — date, merchant,
amount in any order:

    02/08/2026, SWIGGY BANGALORE, 348.00
    05/08/2026, EMI DEBIT HDFC HOME LOAN, 62500.00
    07/08/2026, SALARY CREDIT, 250000.00 CR

Add `CR` at the end of a line to mark it a credit. Always fill in the
statement's declared debit total when importing — that's what makes
reconciliation possible.

## Not in v1 (by design, add later)

- PDF/CSV file upload — paste first, prove the workflow, then automate
  getting the text in. `lib/parser.ts` already does the actual parsing; a
  file-upload route just needs to extract text and call the same function.
- Auth / multi-user / hosting — this runs on your machine only.
- Account-aggregator integration.

## Handing this to Claude Code

This is a real, working, tested app — not a spec. Point Claude Code at this
folder and describe the next increment (e.g. "add CSV upload that extracts
text and feeds it through the existing parseLines function in
lib/parser.ts"). The parsing, classification, and reconciliation logic in
`lib/parser.ts` and `lib/repo.ts` is already correct against real Indian
statement formats — don't have it rewritten from scratch.
