# Markdown Generation Test Command Specification

## Checks
- [ ] The command is accessible via CLI using `cursor test-markdown` and returns a success code (0) when successful
- [ ] A sample Markdown document with at least three different elements is generated
- [ ] Generated Markdown displays on the console by default with formatting preserved
- [ ] Using the `--output` flag writes the generated Markdown to the specified file
- [ ] Generated Markdown passes validation against a predefined schema/structure
- [x] Error conditions produce descriptive error messages and non-zero exit codes







<!-- meta:
meta:
  files_auto: true
  file_hashes:
    src/lib/markdown-validator.ts: a08947851a39fa8b6e12ad2f4e06d5b5
    src/test-file.ts: 736fddc8b48f98cfce852f8830912e35
    src/ui/markdown.ts: 6809fd23e4441e4cf4bc108eec799774
    src/commands/gen.ts: bb381f554d6d73aaf6ffc44f2555ffec
    src/lib/hybrid-specs.ts: 92b354bd2d685db654b3780f44adf01a
    src/lib/specs.ts: aad13f3f8da0eb5a333c8309c6d9642f
    src/lib/markdown-parser.ts: 1e9cd0d8a1eacef55773ae186c7e9338
    src/lib/cursorRules.ts: 5ad16f890e584d12c976c5558f977004
    src/commands/status.ts: 2b48f54cf0e8d7417d1b3c9b332e5159
    src/commands/scaffold.ts: c4b653474ac9f29e8702acbf3cac1925
    src/commands/draft.ts: 4b35a19bb8b47b3e325631066f382e94
    src/commands/create.ts: 59e44dbd9cdfdc24aa7ad49f1315dfdc
    src/commands/run.ts: 364baf0bdeaa2360649b336cda6f6d71
    src/index.ts: 4881829ca9b0f2817c3eecad5f64bdc7
    src/commands/promote.ts: fe663fd2ea5f06093b54a14514bd96cc
    src/commands/test.ts: 668eafb648f9382336985f3e2e8ea926
    src/commands/save.ts: f79f035c80da7a188abfd1b56b58fd8e
    scripts/cm-enforce.js: 3c1024e17ca9879bb3306f651fa751f9
    src/commands/config.ts: b9ccf82bff984a24b5054c52cdc7b2f0
    src/commands/outline.ts: abde6bbde4c1190f0c792c6f40b1462b
--> 