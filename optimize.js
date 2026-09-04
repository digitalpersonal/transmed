const fs = require('fs');
const path = require('path');

function optimizeView(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return;
  let code = fs.readFileSync(fullPath, 'utf-8');

  // Add useMemo to imports if not there
  if (!code.includes('useMemo')) {
    code = code.replace(/import React, { useState } from 'react';/, "import React, { useState, useMemo } from 'react';");
    code = code.replace(/import React, { useState, useEffect } from 'react';/, "import React, { useState, useEffect, useMemo } from 'react';");
  }

  // Optimize filtered arrays
  // Example: const filteredPatients = patients.filter((patient) => { ... });
  const filterRegex = /const (filtered[A-Za-z0-9_]+) = ([A-Za-z0-9_]+)\.filter\(([\s\S]+?)\);\n/g;
  
  let match;
  while ((match = filterRegex.exec(code)) !== null) {
    const varName = match[1];
    const sourceArray = match[2];
    const filterLogic = match[3];

    // Find dependencies for useMemo
    const stateVars = code.match(/const \[([a-zA-Z0-9_]+), set[A-Za-z0-9_]+\] = useState/g);
    let deps = [sourceArray];
    if (stateVars) {
       for (const stateLine of stateVars) {
           const vMatch = /const \[([a-zA-Z0-9_]+), set/.exec(stateLine);
           if (vMatch && vMatch[1]) {
               const v = vMatch[1];
               if (match[0].includes(v)) {
                   deps.push(v);
               }
           }
       }
    }
    const depsStr = deps.join(', ');

    const replacement = `const ${varName} = useMemo(() => ${sourceArray}.filter(${filterLogic}), [${depsStr}]);\n`;
    code = code.replace(match[0], replacement);
  }

  // Also limit mapping to top 150 items to prevent DOM freezing
  // Example: {filteredPatients.map(
  const mapRegex = /\{([A-Za-z0-9_]+)\.map\(/g;
  while ((match = mapRegex.exec(code)) !== null) {
     const arrName = match[1];
     if (arrName.startsWith('filtered') || arrName.startsWith('completed') || arrName.startsWith('scheduled')) {
        // limit to 100
        code = code.replace(match[0], `{${arrName}.slice(0, 100).map(`);
     }
  }

  fs.writeFileSync(fullPath, code);
  console.log('Optimized', filePath);
}

optimizeView('src/components/PatientsView.tsx');
optimizeView('src/components/TripsView.tsx');
optimizeView('src/components/BookingsView.tsx');
optimizeView('src/components/VehiclesView.tsx');
optimizeView('src/components/DriversView.tsx');
optimizeView('src/components/ClosuresAndReportsView.tsx');

