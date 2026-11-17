import './config/environment.js';
import app from './app.js';
import connectDatabase from './config/database.js';
import User from './models/User.js';
import getStartupDiagnostics from './utils/startupDiagnostics.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDatabase();
    await User.init();

    app.listen(PORT, (error) => {
      if (error) {
        console.error('Failed to start HTTP server.', getStartupDiagnostics(error, 'http'));
        process.exit(1);
        return;
      }
      console.log(`Coffee Zone API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server: check the database configuration and availability.', getStartupDiagnostics(error));
    process.exit(1);
  }
};

startServer();
