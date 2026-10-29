"""Tests for the measurement job gate.

The Render free dyno has 0.1 CPU: running two measurements at once makes
both slower than the client's timeout, so jobs run one at a time and the
overflow is rejected immediately instead of timing everyone out.
"""

import asyncio

import pytest

from job_gate import GateFull, JobGate


def test_second_caller_waits_while_first_runs():
    async def scenario():
        gate = JobGate(max_running=1, max_waiting=1)
        events: list[str] = []
        release_first = asyncio.Event()

        async def first():
            async with gate.slot():
                events.append("first-in")
                await release_first.wait()

        async def second():
            async with gate.slot():
                events.append("second-in")

        t1 = asyncio.create_task(first())
        await asyncio.sleep(0)
        t2 = asyncio.create_task(second())
        await asyncio.sleep(0)
        assert events == ["first-in"]

        release_first.set()
        await asyncio.gather(t1, t2)
        assert events == ["first-in", "second-in"]

    asyncio.run(scenario())


def test_caller_beyond_running_and_waiting_is_rejected_immediately():
    async def scenario():
        gate = JobGate(max_running=1, max_waiting=1)
        release = asyncio.Event()

        async def hold():
            async with gate.slot():
                await release.wait()

        tasks = [asyncio.create_task(hold()), asyncio.create_task(hold())]
        await asyncio.sleep(0)

        with pytest.raises(GateFull):
            async with gate.slot():
                pass

        release.set()
        await asyncio.gather(*tasks)

    asyncio.run(scenario())


def test_capacity_frees_up_after_jobs_finish():
    async def scenario():
        gate = JobGate(max_running=1, max_waiting=1)
        for _ in range(3):
            async with gate.slot():
                pass

    asyncio.run(scenario())
