// Bundles the app into one self-contained HTML page (no external files),
// used for the hosted claude.ai version. Usage: node tools/build-artifact.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const index = read('index.html');
const body = index.slice(index.indexOf('<!-- app:start -->') + 18, index.indexOf('<!-- app:end -->')).trim();
const safeScript = (js) => js.replace(/<\/script/gi, '<\\/script');

const html = `<title>Ski Season Fitness</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Mobile workout tracker for a conservative return to training before ski season.">
<style>
${read('css/styles.css')}
</style>
${body}
<script>
${safeScript(read('data/workouts.js'))}
</script>
<script>
${safeScript(read('js/app.js'))}
</script>
`;
mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/ski-season-fitness.html', import.meta.url), html);
console.log(`dist/ski-season-fitness.html (${(html.length / 1024).toFixed(0)} KB)`);
