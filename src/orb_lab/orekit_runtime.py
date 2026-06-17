from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class OrekitRuntimeError(RuntimeError):
    """Raised when the Orekit JVM runtime cannot be initialized."""


@dataclass(frozen=True)
class OrekitRuntimeStatus:
    initialized: bool
    java_home: Path | None
    java_version: str | None
    orekit_jpype_version: str | None
    data_path: Path | None


_STATUS: OrekitRuntimeStatus | None = None
_DATA_LOADED_PATH: Path | None = None


def ensure_orekit() -> OrekitRuntimeStatus:
    """Initialize Orekit/JPype once and return runtime details."""
    global _STATUS

    if _STATUS is not None:
        return _STATUS

    try:
        import importlib.metadata

        import jdk4py
        import orekit_jpype
    except Exception as exc:  # pragma: no cover - depends on local packaging failure
        msg = "Orekit runtime dependencies are not importable."
        raise OrekitRuntimeError(msg) from exc

    data_path = _resolve_orekit_data_path()
    java_home = _coerce_path(getattr(jdk4py, "JAVA_HOME", None))
    _set_java_home_for_jpype(java_home)

    jvm_path = _resolve_jdk4py_jvm_path(java_home)

    try:
        orekit_jpype.initVM(jvmpath=jvm_path)
    except Exception as exc:  # pragma: no cover - covered by monkeypatched tests
        msg = "Orekit JVM initialization failed."
        raise OrekitRuntimeError(msg) from exc

    _STATUS = OrekitRuntimeStatus(
        initialized=True,
        java_home=java_home,
        java_version=_coerce_version(getattr(jdk4py, "JAVA_VERSION", None)),
        orekit_jpype_version=_package_version("orekit-jpype", importlib.metadata),
        data_path=data_path,
    )
    return _STATUS


def reset_runtime_for_tests() -> None:
    """Clear cached runtime metadata without attempting to stop the JVM."""
    global _DATA_LOADED_PATH, _STATUS
    _STATUS = None
    _DATA_LOADED_PATH = None


def ensure_orekit_data() -> Path:
    """Load Orekit data providers from OREKIT_DATA_PATH."""
    global _DATA_LOADED_PATH

    status = ensure_orekit()
    data_path = status.data_path

    if data_path is None:
        msg = "OREKIT_DATA_PATH is required for Orekit TLE propagation."
        raise OrekitRuntimeError(msg)

    if _DATA_LOADED_PATH == data_path:
        return data_path

    try:
        from orekit_jpype.pyhelpers import setup_orekit_data
    except Exception as exc:  # pragma: no cover - depends on local packaging failure
        msg = "Orekit data helper is not importable."
        raise OrekitRuntimeError(msg) from exc

    try:
        setup_orekit_data(filenames=str(data_path), from_pip_library=False)
    except Exception as exc:  # pragma: no cover - covered by monkeypatched tests
        msg = f"Failed to load Orekit data from {data_path}."
        raise OrekitRuntimeError(msg) from exc

    _DATA_LOADED_PATH = data_path
    return data_path


def _resolve_orekit_data_path() -> Path | None:
    raw_path = os.environ.get("OREKIT_DATA_PATH")
    if not raw_path:
        return None

    data_path = Path(raw_path).expanduser()
    if not data_path.exists():
        msg = f"OREKIT_DATA_PATH does not exist: {data_path}"
        raise OrekitRuntimeError(msg)
    return data_path


def _package_version(package_name: str, metadata: Any) -> str | None:
    try:
        return str(metadata.version(package_name))
    except metadata.PackageNotFoundError:
        return None


def _coerce_path(value: object) -> Path | None:
    if value is None:
        return None
    return Path(value)


def _coerce_string(value: object) -> str | None:
    if value is None:
        return None
    return str(value)


def _coerce_version(value: object) -> str | None:
    if isinstance(value, tuple | list):
        return ".".join(str(part) for part in value)
    return _coerce_string(value)


def _set_java_home_for_jpype(java_home: Path | None) -> None:
    if java_home is not None:
        os.environ["JAVA_HOME"] = str(java_home)


def _resolve_jdk4py_jvm_path(java_home: Path | None) -> Path | None:
    if java_home is None:
        return None

    candidates = (
        java_home / "lib" / "server" / "libjvm.dylib",
        java_home / "lib" / "server" / "libjvm.so",
        java_home / "bin" / "server" / "jvm.dll",
    )

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None
