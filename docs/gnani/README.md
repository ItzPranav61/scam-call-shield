# Gnani integration notes

ScamCall Shield keeps provider authentication in the relay. The browser uses our
[application contract](../contract.md), not the provider protocol.

The relay implements Prisma transcription and Timbre warning synthesis. Mock mode
uses synthetic transcripts and generated tone audio without provider calls.
See the [relay README](../../apps/relay/README.md) for local setup.

Provider reference: [Gnani public documentation](https://docs.gnani.ai/).
Raw documentation pages are not distributed in this public copy. The optional
`scripts/fetch_gnani_docs.sh` fetches local references into the ignored `raw/` folder.
Consult the current provider documentation before changing API integration details.
