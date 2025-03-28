# Logging System Documentation

This document explains the logging system used throughout the DAO Voting application, which provides consistent logging that can be enabled or disabled based on the environment.

## Overview

The application uses a custom logging utility located at `src/utils/logger.ts` that provides different levels of logging and automatically adjusts based on the environment (development vs. production).

## Log Levels

The system supports the following log levels, in order of verbosity:

1. **DEBUG** (most verbose): For detailed debugging information
2. **INFO**: For general application information
3. **WARN**: For warnings that don't prevent the application from working
4. **ERROR**: For errors that might impact functionality
5. **NONE**: Disables all logging

In production environments, the default log level is set to **ERROR** to minimize console output while still capturing important errors.

## Usage

### Basic Usage

Import the logger in any file:

```typescript
import logger from '@/utils/logger';

// Then use the appropriate method based on the message importance
logger.debug('Detailed debug information');
logger.info('General information about application state');
logger.warn('Warning that something might be wrong');
logger.error('Error occurred', errorObject);
```

### Configuration

The log level can be configured in three ways:

1. **Environment Variable**: Set `NEXT_PUBLIC_LOG_LEVEL` in your `.env.local` file:

```
NEXT_PUBLIC_LOG_LEVEL=DEBUG  # Options: DEBUG, INFO, WARN, ERROR, NONE
```

2. **Programmatically**: You can change the log level at runtime:

```typescript
import { logger, LogLevel } from '@/utils/logger';

// Set to INFO level
logger.setLogLevel(LogLevel.INFO);
```

3. **Default by Environment**: If not specified, the system defaults to:
   - `DEBUG` in development
   - `ERROR` in production

## Benefits

- **Environment-Aware**: Automatically adjusts verbosity based on environment
- **Centralized Control**: Log levels can be changed in one place
- **Production-Ready**: Minimal logging in production for performance
- **Extensible**: Can be extended to support external logging services

## Best Practices

1. Use appropriate log levels:
   - `debug` for development details
   - `info` for normal operations
   - `warn` for suspicious events
   - `error` for failures

2. Include context in log messages:
   - Function name or component
   - Relevant IDs or parameters
   - Expected vs actual behavior

3. Don't log sensitive information:
   - Private keys
   - Auth tokens
   - Personal user data

4. Consider adding timestamp and component information to log messages in future enhancements.

## Future Improvements

- Integration with external logging services (e.g., Sentry, LogRocket)
- Structured logging format for better parsing
- Log rotation and persistence
- Component-specific log levels 