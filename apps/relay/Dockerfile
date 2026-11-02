# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS manifests
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/relay/package.json ./apps/relay/package.json
COPY packages/protocol/package.json ./packages/protocol/package.json
COPY packages/detector/package.json ./packages/detector/package.json

FROM manifests AS build
RUN npm ci --ignore-scripts
COPY tsconfig.base.json ./
COPY packages/protocol/tsconfig.json ./packages/protocol/tsconfig.json
COPY packages/protocol/src ./packages/protocol/src
COPY packages/detector/tsconfig.json packages/detector/tsconfig.build.json ./packages/detector/
COPY packages/detector/src ./packages/detector/src
COPY apps/relay/tsconfig.json apps/relay/tsconfig.build.json ./apps/relay/
COPY apps/relay/src ./apps/relay/src
# The root Node build script builds protocol, detector and relay; no web UI is bundled.
RUN npm run build:node

FROM manifests AS production-deps
RUN npm ci --omit=dev --workspace=@scamcall/relay --include-workspace-root=false --ignore-scripts
# Some production packages ship tests and env fixtures; remove those from the app payload.
RUN node -e "const fs=require('node:fs'),p=require('node:path'),root=fs.realpathSync('node_modules'); function scrub(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.join(d,e.name); if(e.isSymbolicLink())continue; if(['test','tests','__tests__'].includes(e.name)||/^\.env(?:\.|$)/.test(e.name)||/\.(?:test|spec)\.[^.]+$/.test(e.name)){if(!p.resolve(f).startsWith(root+p.sep))throw Error('Unsafe cleanup path');fs.rmSync(f,{recursive:true,force:true});}else if(e.isDirectory())scrub(f);}}scrub(root);"

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8787 DEBUG_TRANSCRIPTS=0
COPY --from=manifests /app/package.json ./package.json
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=manifests /app/apps/relay/package.json ./apps/relay/package.json
COPY --from=manifests /app/packages/protocol/package.json ./packages/protocol/package.json
COPY --from=manifests /app/packages/detector/package.json ./packages/detector/package.json
COPY --from=build /app/apps/relay/dist ./apps/relay/dist
COPY --from=build /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=build /app/packages/detector/dist ./packages/detector/dist
COPY data/scenarios/*.json ./data/scenarios/
USER node
EXPOSE 8787
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||'8787')+'/health',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "apps/relay/dist/apps/relay/src/index.js", "--mock"]
