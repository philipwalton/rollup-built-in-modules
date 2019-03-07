/*
 Copyright 2019 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

const express = require('express');
const fs = require('fs-extra');
const nunjucks = require('nunjucks');
const path = require('path');
const pkg = require('./package.json');


nunjucks.configure({
  noCache: process.env.NODE_ENV !== 'production',
});

const generateImportMap = (manifest) => {
  const importmap = {imports: {}};
  for (const [name, filepath] of Object.entries(manifest)) {
    if (name.startsWith('std:')) {
      importmap.imports[filepath] = [name, filepath];
    }
  }
  return JSON.stringify(importmap, null, 2);
};


const app = express();

app.use(express.static(pkg.config.publicDir));

app.get('/', function(request, response) {
  const manifest = fs.readJsonSync(
      path.join(pkg.config.publicDir, 'entry-manifest.json'));

  const importMap = generateImportMap(manifest);

  const templateData = {manifest, importMap};
  response.send(nunjucks.render('views/index.njk.html', templateData));
});

const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
