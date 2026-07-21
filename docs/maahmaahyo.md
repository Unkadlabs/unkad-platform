# Maahmaahyo — workflow

The first Unkad dataset: Somali proverbs with translations, meanings, and
dialect notes. Founder-curated, reviewer-verified, released CC BY-SA 4.0.

## How it works

1. **Collect.** Add proverbs to [`data/maahmaahyo/maahmaahyo.tsv`](../data/maahmaahyo/maahmaahyo.tsv)
   (tab-separated; open it in any spreadsheet). Columns: `id`, `proverb_so`,
   `translation_en`, `meaning_en`, `dialect` (`maxaa_tiri`/`maay`/`both`),
   `notes`, `verified_by`. Three widely attested examples are included as
   format references — **verify them too** before release.
2. **Verify.** A trusted reviewer checks each row (spelling, translation,
   meaning, dialect) and puts their name in `verified_by`. Rows without a
   verifier are excluded from any release, mechanically.
3. **Release.** `npm run maahmaahyo:build` for a dry run (writes
   `export/maahmaahyo/` with the JSONL and the dataset card).
   `PUSH=1 HF_TOKEN=... npm run maahmaahyo:build` publishes verified rows to
   `unkadlabs/maahmaahyo` on Hugging Face. The script refuses to push if
   nothing is verified.
4. **Post.** `npm run maahmaahyo:cards` renders one branded card PNG per
   proverb into `export/maahmaahyo/cards/`. Daily post template:

   > Maahmaah: [proverb_so]
   >
   > "[translation_en]" — [meaning_en]
   >
   > [attach the card image]

   One a day. The whole month's cards generate in one command.

## Target for v0.1

200–300 verified proverbs. At that size it's a real dataset (folklore is a
shared inheritance; the compilation ships CC BY-SA so it stays shared), and
the card queue covers most of a year of daily posts.
