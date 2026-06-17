from __future__ import annotations

import sys
from types import SimpleNamespace

import pytest

from orb_lab import orekit_runtime


@pytest.fixture(autouse=True)
def reset_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("JAVA_HOME", raising=False)
    orekit_runtime.reset_runtime_for_tests()


def test_ensure_orekit_initializes_once(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[object] = []

    def init_vm(*, jvmpath: object) -> None:
        calls.append(jvmpath)

    monkeypatch.setitem(
        sys.modules,
        "jdk4py",
        SimpleNamespace(JAVA_HOME="/tmp/fake-jdk", JAVA_VERSION="24.0.1"),
    )
    monkeypatch.setitem(sys.modules, "orekit_jpype", SimpleNamespace(initVM=init_vm))

    first = orekit_runtime.ensure_orekit()
    second = orekit_runtime.ensure_orekit()

    assert first is second
    assert first.initialized is True
    assert first.java_home is not None
    assert first.java_home.as_posix() == "/tmp/fake-jdk"
    assert first.java_version == "24.0.1"
    assert first.orekit_jpype_version is not None
    assert first.data_path is None
    assert calls == [None]


def test_ensure_orekit_records_existing_data_path(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("OREKIT_DATA_PATH", str(tmp_path))
    monkeypatch.setitem(
        sys.modules,
        "jdk4py",
        SimpleNamespace(JAVA_HOME="/tmp/fake-jdk", JAVA_VERSION="24.0.1"),
    )
    monkeypatch.setitem(sys.modules, "orekit_jpype", SimpleNamespace(initVM=lambda **_: None))

    status = orekit_runtime.ensure_orekit()

    assert status.data_path == tmp_path


def test_ensure_orekit_rejects_missing_data_path(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("OREKIT_DATA_PATH", str(tmp_path / "missing"))
    monkeypatch.setitem(
        sys.modules,
        "jdk4py",
        SimpleNamespace(JAVA_HOME="/tmp/fake-jdk", JAVA_VERSION="24.0.1"),
    )
    monkeypatch.setitem(sys.modules, "orekit_jpype", SimpleNamespace(initVM=lambda **_: None))

    with pytest.raises(orekit_runtime.OrekitRuntimeError, match="OREKIT_DATA_PATH"):
        orekit_runtime.ensure_orekit()


def test_ensure_orekit_wraps_initialization_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def init_vm(**_: object) -> None:
        msg = "boom"
        raise RuntimeError(msg)

    monkeypatch.setitem(
        sys.modules,
        "jdk4py",
        SimpleNamespace(JAVA_HOME="/tmp/fake-jdk", JAVA_VERSION="24.0.1"),
    )
    monkeypatch.setitem(sys.modules, "orekit_jpype", SimpleNamespace(initVM=init_vm))

    with pytest.raises(orekit_runtime.OrekitRuntimeError, match="initialization failed"):
        orekit_runtime.ensure_orekit()


def test_importing_api_does_not_initialize_orekit(monkeypatch: pytest.MonkeyPatch) -> None:
    def init_vm() -> None:
        msg = "api import should not initialize Orekit"
        raise AssertionError(msg)

    monkeypatch.setitem(
        sys.modules,
        "jdk4py",
        SimpleNamespace(JAVA_HOME="/tmp/fake-jdk", JAVA_VERSION="24.0.1"),
    )
    monkeypatch.setitem(sys.modules, "orekit_jpype", SimpleNamespace(initVM=init_vm))

    import orb_lab.api  # noqa: F401


def test_ensure_orekit_uses_jdk4py_jvm_path(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    java_home = tmp_path / "jdk"
    jvm_path = java_home / "lib" / "server" / "libjvm.dylib"
    jvm_path.parent.mkdir(parents=True)
    jvm_path.touch()
    calls: list[object] = []

    def init_vm(*, jvmpath: object) -> None:
        calls.append(jvmpath)

    monkeypatch.setitem(
        sys.modules,
        "jdk4py",
        SimpleNamespace(JAVA_HOME=java_home, JAVA_VERSION="25.0.2"),
    )
    monkeypatch.setitem(sys.modules, "orekit_jpype", SimpleNamespace(initVM=init_vm))

    orekit_runtime.ensure_orekit()

    assert calls == [jvm_path]
