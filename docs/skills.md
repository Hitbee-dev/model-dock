# Skills

ModelDock skills are human-readable operational units.

## What is a ModelDock skill?

A skill contains documentation and optional metadata, examples, scripts, or fixtures. Skills must declare permissions and be easy to inspect, disable, and document.

## Planned layout

```text
SKILL.md
metadata.json
examples/
scripts/
fixtures/
```

## Security caveats

Any skill that can access the network, filesystem, shell, credentials, or provider tokens must be disabled by default until a user or admin enables it.

Last updated: 2026-05-02
