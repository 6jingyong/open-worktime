import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createPreviewServer } from '../scripts/serve.mjs';

test('local preview serves the app, ES modules and aggregate example without dependencies', async t => {
  const server = createPreviewServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  for (const [path, type, text] of [
    ['/', 'text/html', 'Open Worktime'],
    ['/partners.html#preview', 'text/html', 'preview-example'],
    ['/cities.html', 'text/html', '六个世界'],
    ['/city-demo.mjs', 'text/javascript', 'makeView'],
    ['/survey-app.js', 'text/javascript', 'importFile'],
    ['/survey.mjs', 'text/javascript', 'parseSurveyCsv'],
    ['/data/survey-manifest.json', 'application/json', 'fictional-surveys-v1'],
    ['/data/city-scenarios.json', 'application/json', 'synthetic'],
    ['/docs/examples/fictional-city-brief.html', 'text/html', 'CSV 调研简报'],
    ['/data/surveys/hangzhou.synthetic.csv', 'text/csv', '人物序号'],
    ['/docs/examples/survey-template.csv', 'text/csv', '雇佣形式'],
    ['/partner-preview.mjs', 'text/javascript', 'previewAggregates'],
    ['/docs/examples/partner-aggregate-example.csv', 'text/csv', 'anonymous_factory_id'],
    ['/data/brands.json', 'application/json', 'bt-puma']
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get('content-type').startsWith(type), path);
    assert.ok((await response.text()).includes(text), path);
  }

  const head = await fetch(base + '/partner-preview.mjs', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.ok(Number(head.headers.get('content-length')) > 0);
  assert.equal(await head.text(), '');

  for (const path of ['/.git/config', '/backend/wrangler.jsonc', '/private-work/data.json',
    '/docs/%2e%2e%2f.git/config', '/docs/..%5c.git/config', '/docs/%00.csv', '/missing.html']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  assert.equal((await fetch(base + '/docs/%')).status, 400);
  assert.equal((await fetch(base + '/', { method: 'POST', body: 'test' })).status, 405);
});
