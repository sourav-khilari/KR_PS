# Workspace Folder Tree

`web-kr/`
├── `.gitignore`
├── `README.md`
├── `package.json`
├── `package-lock.json`
├── `dev-server.err.log`
├── `dev-server.out.log`
├── `analysis_input/`
│   ├── `PURULIA TRUCK LOAD DETAILS (2026-27).xlsx`
│   └── `SHREE PURULIA PAYMENT (2026-27).xlsx`
├── `analysis_output/`
│   ├── `business_patterns.json`
│   ├── `column_style_summary.json`
│   └── `workbook_analysis.json`
├── `backend/`
│   └── `server/`
│       ├── `.env`
│       ├── `.env.example`
│       ├── `node_modules/`
│       ├── `package.json`
│       ├── `src/`
│       │   ├── `app.js`
│       │   ├── `index.js`
│       │   ├── `config/`
│       │   │   └── `db.js`
│       │   ├── `controllers/`
│       │   │   └── `masterImport.controller.js`
│       │   ├── `middleware/`
│       │   │   ├── `error.middleware.js`
│       │   │   └── `upload.middleware.js`
│       │   ├── `models/`
│       │   │   └── `MasterImport.js`
│       │   ├── `routes/`
│       │   │   └── `masterImport.routes.js`
│       │   └── `services/`
│       │       ├── `excelParser.service.js`
│       │       └── `validation.service.js`
│       └── `tests/`
│           ├── `excelParser.test.js`
│           ├── `masterImport.integration.test.js`
│           └── `validation.test.js`
├── `docs/`
│   ├── `API_Design.md`
│   ├── `Architecture.md`
│   ├── `ASSUMPTIONS.md`
│   ├── `Business_Rules.md`
│   ├── `Database_Design.md`
│   ├── `Future_Features.md`
│   ├── `Payment_Generation_Rules.md`
│   └── `Validation_Rules.md`
├── `frontend/`
│   └── `client/`
│       ├── `dist/`
│       ├── `index.html`
│       ├── `node_modules/`
│       ├── `package.json`
│       └── `src/`
│           ├── `App.jsx`
│           ├── `main.jsx`
│           ├── `styles.css`
│           ├── `components/`
│           │   ├── `LoginPlaceholder.jsx`
│           │   ├── `ParsedDataTable.jsx`
│           │   ├── `UploadPage.jsx`
│           │   └── `ValidationPanel.jsx`
│           └── `services/`
│               └── `api.js`
├── `shared/`
│   └── `utils/`
│       ├── `package.json`
│       └── `src/`
│           └── `index.js`
├── `tools/`
│   ├── `analyze_workbooks.py`
│   ├── `column_style_summary.py`
│   └── `extract_business_patterns.py`
└── `node_modules/`
    ├── `.bin/`
    ├── `.package-lock.json`
    ├── `@babel/`
    ├── `@esbuild/`
    ├── `@jridgewell/`
    ├── `@mongodb-js/`
    ├── `@noble/`
    ├── `@paralleldrive/`
    ├── `@rolldown/`
    ├── `@rollup/`
    ├── `@truck-payments/`
    ├── `@types/`
    ├── `@vitejs/`
    ├── `@vitest/`
    ├── `accepts/`
    ├── `adler-32/`
    ├── `ansi-regex/`
    ├── `ansi-styles/`
    ├── `anymatch/`
    ├── `append-field/`
    ├── `array-flatten/`
    ├── `asap/`
    ├── `assertion-error/`
    ├── `asynckit/`
    ├── `balanced-match/`
    ├── `baseline-browser-mapping/`
    ├── `binary-extensions/`
    ├── `body-parser/`
    ├── `brace-expansion/`
    ├── `braces/`
    ├── `browserslist/`
    ├── `bson/`
    ├── `buffer-from/`
    ├── `busboy/`
    ├── `bytes/`
    ├── `cac/`
    ├── `call-bind-apply-helpers/`
    ├── `call-bound/`
    ├── `caniuse-lite/`
    ├── `cfb/`
    ├── `chai/`
    ├── `chalk/`
    ├── `check-error/`
    ├── `chokidar/`
    ├── `cliui/`
    ├── `codepage/`
    ├── `color-convert/`
    ├── `color-name/`
    ├── `combined-stream/`
    ├── `component-emitter/`
    ├── `concat-stream/`
    ├── `concurrently/`
    ├── `content-disposition/`
    ├── `content-type/`
    ├── `convert-source-map/`
    ├── `cookie/`
    ├── `cookie-signature/`
    ├── `cookiejar/`
    ├── `cors/`
    ├── `crc-32/`
    ├── `date-fns/`
    ├── `debug/`
    ├── `deep-eql/`
    ├── `delayed-stream/`
    ├── `depd/`
    ├── `destroy/`
    ├── `dezalgo/`
    ├── `dotenv/`
    ├── `dunder-proto/`
    ├── `ee-first/`
    ├── `electron-to-chromium/`
    ├── `emoji-regex/`
    ├── `encodeurl/`
    ├── `es-define-property/`
    ├── `es-errors/`
    ├── `es-module-lexer/`
    ├── `es-object-atoms/`
    ├── `es-set-tostringtag/`
    ├── `esbuild/`
    ├── `escalade/`
    ├── `escape-html/`
    ├── `estree-walker/`
    ├── `etag/`
    ├── `expect-type/`
    ├── `express/`
    ├── `fast-safe-stringify/`
    ├── `fill-range/`
    ├── `finalhandler/`
    ├── `form-data/`
    ├── `formidable/`
    ├── `forwarded/`
    ├── `frac/`
    ├── `fresh/`
    ├── `function-bind/`
    ├── `gensync/`
    ├── `get-caller-file/`
    ├── `get-intrinsic/`
    ├── `get-proto/`
    ├── `glob-parent/`
    ├── `gopd/`
    ├── `has-flag/`
    ├── `has-symbols/`
    ├── `has-tostringtag/`
    ├── `hasown/`
    ├── `http-errors/`
    ├── `iconv-lite/`
    ├── `ignore-by-default/`
    ├── `inherits/`
    ├── `ipaddr.js/`
    ├── `is-binary-path/`
    ├── `is-extglob/`
    ├── `is-fullwidth-code-point/`
    ├── `is-glob/`
    ├── `is-number/`
    ├── `js-tokens/`
    ├── `jsesc/`
    ├── `json5/`
    ├── `kareem/`
    ├── `lodash/`
    ├── `loose-envify/`
    ├── `loupe/`
    ├── `lru-cache/`
    ├── `magic-string/`
    ├── `math-intrinsics/`
    ├── `media-typer/`
    ├── `memory-pager/`
    ├── `merge-descriptors/`
    ├── `methods/`
    ├── `mime/`
    ├── `mime-db/`
    ├── `mime-types/`
    ├── `minimatch/`
    ├── `mongodb/`
    ├── `mongodb-connection-string-url/`
    ├── `mongoose/`
    ├── `mpath/`
    ├── `mquery/`
    ├── `ms/`
    ├── `multer/`
    ├── `nanoid/`
    ├── `negotiator/`
    ├── `node-releases/`
    ├── `nodemon/`
    ├── `normalize-path/`
    ├── `object-assign/`
    ├── `object-inspect/`
    ├── `on-finished/`
    ├── `once/`
    ├── `parseurl/`
    ├── `path-to-regexp/`
    ├── `pathe/`
    ├── `pathval/`
    ├── `picocolors/`
    ├── `picomatch/`
    ├── `postcss/`
    ├── `proxy-addr/`
    ├── `pstree.remy/`
    ├── `punycode/`
    ├── `qs/`
    ├── `range-parser/`
    ├── `raw-body/`
    ├── `react/`
    ├── `react-dom/`
    ├── `react-refresh/`
    ├── `readable-stream/`
    ├── `readdirp/`
    ├── `require-directory/`
    ├── `rollup/`
    ├── `rxjs/`
    ├── `safe-buffer/`
    ├── `safer-buffer/`
    ├── `scheduler/`
    ├── `send/`
    ├── `serve-static/`
    ├── `setprototypeof/`
    ├── `shell-quote/`
    ├── `side-channel/`
    ├── `side-channel-list/`
    ├── `side-channel-map/`
    ├── `side-channel-weakmap/`
    ├── `sift/`
    ├── `siginfo/`
    ├── `simple-update-notifier/`
    ├── `source-map-js/`
    ├── `sparse-bitfield/`
    ├── `spawn-command/`
    ├── `ssf/`
    ├── `stackback/`
    ├── `statuses/`
    ├── `std-env/`
    ├── `streamsearch/`
    ├── `string-width/`
    ├── `string_decoder/`
    ├── `strip-ansi/`
    ├── `superagent/`
    ├── `supertest/`
    ├── `supports-color/`
    ├── `tinybench/`
    ├── `tinyexec/`
    ├── `tinypool/`
    ├── `tinyrainbow/`
    ├── `tinyspy/`
    ├── `to-regex-range/`
    ├── `toidentifier/`
    ├── `touch/`
    ├── `tr46/`
    ├── `tree-kill/`
    ├── `tslib/`
    ├── `type-is/`
    ├── `typedarray/`
    ├── `undefsafe/`
    ├── `unpipe/`
    ├── `update-browserslist-db/`
    ├── `util-deprecate/`
    ├── `utils-merge/`
    ├── `vary/`
    ├── `vite/`
    ├── `vite-node/`
    ├── `vitest/`
    ├── `webidl-conversions/`
    ├── `whatwg-url/`
    ├── `why-is-node-running/`
    ├── `wmf/`
    ├── `word/`
    ├── `wrap-ansi/`
    ├── `wrappy/`
    ├── `xlsx/`
    ├── `y18n/`
    ├── `yallist/`
    ├── `yargs/`
    └── `yargs-parser/`
