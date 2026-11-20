import { useContext, useSyncExternalStore } from 'react';
import { DataContext } from '../context/DataContext.js';

export default function useData() {
  const services = useContext(DataContext);
  const data = useSyncExternalStore(services.subscribe, services.getSnapshot, services.getSnapshot);
  return { ...data, services };
}
