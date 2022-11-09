

from endpoints.session import SESSION_ENDPOINTS_IMPORTED
if SESSION_ENDPOINTS_IMPORTED:
    print('[Server] Session management endpoints registered.')

from endpoints.log_management import LOG_MANAGEMENT_ENDPOINTS_IMPORTED
if LOG_MANAGEMENT_ENDPOINTS_IMPORTED:
    print('[Server] Event log management endpoints registered.')

from endpoints.pm import PROCESS_MINING_ENDPOINTS_IMPORTED
if PROCESS_MINING_ENDPOINTS_IMPORTED:
    print('[Server] Process mining endpoints registered.')

ALL_ENDPOINTS_IMPORTED = True