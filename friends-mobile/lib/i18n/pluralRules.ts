import { shouldPolyfill } from '@formatjs/intl-pluralrules/should-polyfill.js';

// Hermes' Intl.PluralRules doesn't resolve Polish one/few/many, so i18next fell back to
// `_other` ("30 osoby", "1 lat"). Load the FormatJS polyfill plus locale data for the
// languages the app ships; must run before i18next initialises.
if (shouldPolyfill('pl')) {
  require('@formatjs/intl-pluralrules/polyfill-force.js');
}
require('@formatjs/intl-pluralrules/locale-data/en.js');
require('@formatjs/intl-pluralrules/locale-data/pl.js');
