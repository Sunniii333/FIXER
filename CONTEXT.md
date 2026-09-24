# The Fixer

A personal tool that turns each piece of received work into a Mission with a concrete First step taken within five minutes, and keeps evidence of it.

## Language

**Mission (ภารกิจ)**:
One piece of work the owner received.

**Instruction (คำสั่งงาน)**:
What the Mission asks for, in the requester's words. The minimum needed to note a Mission.

**First step (ก้าวแรก)**:
The smallest concrete action that begins the work. Naming it and tapping **เริ่มลงมือ** makes the Mission active; tapping **ทำก้าวแรกแล้ว** records that it was done.

**Five-minute clock**:
The time from Clock start to the First step being marked done (**ทำก้าวแรกแล้ว**).

**Clock start**:
The moment the Five-minute clock begins: the Pick up time for a Mission that went through the Queue, otherwise the moment it was received.

**On-time start (เริ่มทันเวลา)**:
A First step marked done at or under five minutes after Clock start. Anything else, once resolved, is a **miss**. The On-time start rate is grouped by the month of Clock start.
_Avoid_: counting at เริ่มลงมือ — going active does not stop the clock.

**Draft (ร่าง)**:
A Mission received, or picked up, that is not active yet. Its clock is running.

**Queued (รอคิว)**:
A Mission noted for later, with no clock running. It is still Open.

**Queue (เข้าคิว)**:
Moving a Draft that was never picked up, and is at most five minutes past receipt, into Queued. A Mission passes through the Queue at most once.

**Pick up (หยิบ)**:
Moving a Queued Mission back to Draft; its Clock start is that moment.

**Resume (ทำต่อ)**:
Reopening a Draft to continue it. It never touches the clock.

**Dropped (ยกเลิกภารกิจ)**:
Closed without doing it, with a reason. A Mission Dropped straight from the Queue is not a miss.
_Avoid_: ทิ้งภารกิจ

**Open (ค้างอยู่)**:
A Mission that is not done, Dropped or deleted. Queued Missions are Open.
