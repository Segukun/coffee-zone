import { useEffect, useState } from 'react';
import { createLocalServices } from '../services/localData.js';
import { DataContext } from './DataContext.js';

export default function DataProvider({ children }) {
  const [services] = useState(createLocalServices);

  useEffect(() => () => services.dispose(), [services]);

  return <DataContext.Provider value={services}>{children}</DataContext.Provider>;
}
