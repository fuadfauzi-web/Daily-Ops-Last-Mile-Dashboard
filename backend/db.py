"""Database pool + small query helpers (OceanBase / MySQL-wire via asyncmy)."""
import os
from urllib.parse import unquote, urlparse

import asyncmy

_pool = None


def _dsn() -> dict:
    u = urlparse(os.environ["DATABASE_URL"])
    return {
        "host": u.hostname,
        "port": u.port or 2881,
        "user": unquote(u.username or ""),
        "password": unquote(u.password or ""),
        "db": (u.path or "/").lstrip("/"),
    }


async def init_pool() -> None:
    global _pool
    if os.getenv("DATABASE_URL"):
        _pool = await asyncmy.create_pool(**_dsn(), autocommit=True)


async def close_pool() -> None:
    if _pool is not None:
        _pool.close()
        await _pool.wait_closed()


async def fetch_one(sql: str, params: tuple = ()) -> tuple | None:
    async with _pool.acquire() as conn, conn.cursor() as cur:
        await cur.execute(sql, params)
        return await cur.fetchone()


async def fetch_all(sql: str, params: tuple = ()) -> list[tuple]:
    async with _pool.acquire() as conn, conn.cursor() as cur:
        await cur.execute(sql, params)
        return await cur.fetchall()


async def execute(sql: str, params: tuple = ()) -> int:
    async with _pool.acquire() as conn, conn.cursor() as cur:
        await cur.execute(sql, params)
        return cur.lastrowid


async def execute_many(sql: str, param_list: list[tuple]) -> None:
    if not param_list:
        return
    async with _pool.acquire() as conn, conn.cursor() as cur:
        await cur.executemany(sql, param_list)
