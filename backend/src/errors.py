"""Machine-readable error codes for the API boundary.

Known application and validation errors carry a stable ``code`` in the
response envelope's ``extra`` field so clients can translate them instead of
parsing human-readable detail text. Unknown server errors intentionally carry
no code: clients fall back to their localized generic message.
"""

from typing import Any

from litestar.exceptions import HTTPException
from litestar.status_codes import HTTP_409_CONFLICT

DUPLICATE_LICENSE = "duplicate_license"
ODOMETER_SEQUENCE_SAME_DATE = "odometer_sequence_same_date"
ODOMETER_SEQUENCE_TOO_HIGH = "odometer_sequence_too_high"
ODOMETER_SEQUENCE_TOO_LOW = "odometer_sequence_too_low"


def conflict(
    detail: str,
    *,
    code: str,
    params: dict[str, Any] | None = None,
) -> HTTPException:
    """Build a 409 conflict carrying a machine-readable ``code`` in ``extra``.

    ``params`` holds the machine-readable values behind the conflict (e.g.
    the boundary ``km`` of a violated sequence rule) that clients format into
    the translated message.
    """
    extra: dict[str, Any] = {"code": code}
    if params is not None:
        extra["params"] = params
    return HTTPException(status_code=HTTP_409_CONFLICT, detail=detail, extra=extra)
