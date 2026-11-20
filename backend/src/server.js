import './config/environment.js';
import { validateStartupConfig } from './config/security.js';
import connectDatabase from './config/database.js';
import User from './models/User.js';
import getStartupDiagnostics from './utils/startupDiagnostics.js';

const startServer = async () => {
  try {
    const { port } = validateStartupConfig();
    const { default: app } = await import('./app.js');
    await connectDatabase();
    await User.init();

    app.listen(port, (error) => {
      if (error) {
        console.error('Failed to start HTTP server.', getStartupDiagnostics(error, 'http'));
        process.exit(1);
        return;
      }
      console.log(`Coffee Zone API running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server: check the database configuration and availability.', getStartupDiagnostics(error));
    process.exit(1);
  }
};

startServer();
