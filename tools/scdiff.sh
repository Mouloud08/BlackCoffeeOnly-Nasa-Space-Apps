#!/bin/sh
# Self-check must be identical to version 4 (timings removed).
cd "$(dirname "$0")/.." && node tools/selfcheck.mjs | sed 's/([0-9]* ms;/(ms;/' > /tmp/sc-now.txt && sed 's/([0-9]* ms;/(ms;/' tools/selfcheck.v4.txt > /tmp/sc-v4.txt && diff /tmp/sc-v4.txt /tmp/sc-now.txt && echo "SELF-CHECK IDENTICAL TO V4"
