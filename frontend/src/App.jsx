import { BrowserRouter } from 'react-router-dom';
import DataProvider from './context/DataProvider.jsx';
import AppRouter from './routes/AppRouter.jsx';

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </DataProvider>
  );
}
