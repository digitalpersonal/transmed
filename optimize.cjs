const fs = require('fs');
const path = require('path');

function optimizeView(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return;
  let code = fs.readFileSync(fullPath, 'utf-8');

  let optimized = false;

  // Add useMemo to imports if not there
  if (!code.includes('useMemo')) {
    code = code.replace(/import React, \{ useState \} from 'react';/, "import React, { useState, useMemo } from 'react';");
    code = code.replace(/import React, \{ useState, useEffect \} from 'react';/, "import React, { useState, useEffect, useMemo } from 'react';");
  }

  // 1. Find the filtering block.
  // Instead of simple regex, let's look for known assignments:
  // const filteredPatients = patients.filter((patient) => {
  const assignments = [
    'filteredPatients = patients.filter',
    'filteredTrips = trips.filter',
    'filteredPassengers = trips.reduce',
    'filteredVehicles = vehicles.filter',
    'filteredDrivers = drivers.filter'
  ];

  for (const assign of assignments) {
    if (code.includes('const ' + assign)) {
      console.log('Found manual filtering for ' + assign + ' in ' + filePath);
      // We'll replace it manually by reading the file and replacing the block.
    }
  }

  fs.writeFileSync(fullPath, code);
}

optimizeView('src/components/PatientsView.tsx');
optimizeView('src/components/TripsView.tsx');
optimizeView('src/components/BookingsView.tsx');
optimizeView('src/components/VehiclesView.tsx');
optimizeView('src/components/DriversView.tsx');
optimizeView('src/components/ClosuresAndReportsView.tsx');
