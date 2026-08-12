# Brand logos

This folder is empty by design — no bank or card-network logo artwork ships with this
repo. Those are trademarks owned by their respective issuers.

If you want real logos on your own personal copy of the app, drop the files here and they
are picked up automatically. Nothing else to wire up.

## Naming

Name each file after the issuer slug. `.svg` is tried first, then `.png`, then `.webp` —
so `icici.svg`, `icici.png` and `icici.webp` all work:

| File              | Matches account names containing |
| ----------------- | -------------------------------- |
| `amex.svg`        | amex, american express           |
| `amazonpay.svg`   | amazon pay                       |
| `icici.svg`       | icici                            |
| `hdfc.svg`        | hdfc                             |
| `axis.svg`        | axis                             |
| `sbi.svg`         | sbi, state bank                  |
| `kotak.svg`       | kotak                            |
| `bonvoy.svg`      | bonvoy, marriott                 |
| `idfc.svg`        | idfc                             |
| `yesbank.svg`     | yes bank                         |
| `indusind.svg`    | indusind                         |

The mapping lives in `brandSlug()` in `lib/cardMeta.ts` — add a row there for any issuer
not listed above.

## Behaviour

- File present → rendered on a white tile, centred, in `BrandBadge`.
- File missing or fails to load → falls back to a brand-coloured tile with the issuer's
  short name (`AMEX`, `ICICI`, `HDFC`, …). This is the default state.

## Where to get them

Most banks publish brand/press asset kits on their corporate sites, and the card networks
have official brand centres. Use assets you're permitted to use — this is a private
personal app, but that's your call to make, not something the code assumes for you.

Square-ish, transparent-background SVGs look best at the 40px tile size.
