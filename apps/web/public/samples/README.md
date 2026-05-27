# Sample documents

Demo-mode placeholder files served by `@sangam/demo`'s storage provider when
`DEMO_MODE=true`.

Expected files:

- `sample-document.pdf` — generic catch-all download
- `sample-legal-document.pdf` — served for `tenant-legal-docs` uploads
- `sample-employee-document.pdf` — served for `employee-docs` uploads
- `sample-payslip.pdf` — served for `payslips` downloads
- `sample-invoice.pdf` — served for `invoices` downloads
- `sample-image.png` — served for any image upload

These files are placeholder content for demos. Replace them with anything
you'd like prospects/testers to see when downloading uploaded files.

In production (`DEMO_MODE=false`) uploads are persisted to S3 / Vercel Blob
and these placeholders are never served.
