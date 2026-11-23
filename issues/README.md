# Issues

| # | Title | Status | Depends on | Priority |
|---|---|---|---|---|
| [01](01-graph-layout-and-readability.md) | Network graph: layout, readability, who-knows-whom | in-progress | none | P1 |
| [02](02-graph-pan-vs-scroll.md) | Graph: one-finger pan fights the page ScrollView | todo | 01 | P2 |
| [03](03-graph-suggested-connections.md) | Graph: suggest connections from shared stories | todo | 01 | P3 |
| [04](04-design-tokens-status-colors.md) | Design tokens: onInk, danger, warn; remove remaining hex literals | done | none | P2 |
| [05](05-fzdialog-migration.md) | Migrate Paper `Dialog` to `FzDialog` | todo | none | P2 |
| [06](06-shared-buttons-cards-appbar.md) | Shared PrimaryButton / FzCard / AppBar / EmptyState | todo | 04 | P2 |
| [07](07-redesign-old-screens.md) | Redesign remaining old-style screens | todo | 04, 05, 06 | P2 |
| [08](08-extraction-wrong-query-key.md) | AI extraction invalidates wrong query key → stale conflicts, duplicate relations | done | none | P1 |
| [09](09-dates-utc-off-by-one.md) | Dates shift one day in UTC+ (Poland): met date, exports, brain-dump diff | done | none | P1 |
| [10](10-cannot-clear-birthday.md) | Birthday / date precision can't be cleared from edit form | done | none | P1 |
| [11](11-birthday-notifications-not-rescheduled.md) | Birthday notifications not rescheduled on edit/delete | done | 10 | P1 |
| [12](12-extraction-uses-deleted-people.md) | AI extraction & review queue include deleted people/stories | done | none | P1 |
| [13](13-secrets-weak-encryption.md) | Secrets: repeating-key XOR encryption; deleted secrets keep ciphertext | todo | none | P1 (security) |
| [14](14-deleted-person-leftovers.md) | Deleting a person leaves connections, events, reminders visible | done | none | P2 |
| [15](15-pending-metadata-double-json.md) | Pending extraction metadata JSON-encoded twice | done | none | P2 |
| [16](16-import-export-gaps.md) | Import: no UI refresh, orphan ids; export misses events, CSV escaping | todo | 09 | P2 |
| [17](17-gifts-relations-invalidation.md) | Gifts and Relations sections go out of sync | done | none | P2 |
| [18](18-deleted-profile-photo.md) | Deleting current profile photo leaves a broken avatar | done | none | P2 |
| [19](19-home-birthday-badge.md) | Home birthday badge: duplicated logic, leap-day bug, untranslated | done | none | P2 |
| [20](20-ambiguous-new-person-fails.md) | Choosing NEW for an ambiguous name can abort extraction | todo | none | P2 |
| [21](21-lint-ignores-ui.md) | ESLint ignores app/, components/, hooks/, store/ | todo | none | P2 |
| [22](22-i18n-reminders-and-prod-logging.md) | Reminder text hardcoded English; debug logging in production | todo | none | P3 |
| [23](23-small-ux-bugs.md) | Small UX bugs: search story result, timeline multi-person edit | todo | none | P3 |
