import { describe, expect, it } from 'vitest';
import { createMascotLife, type Emotion, restingFace } from './life';

/**
 * A life whose random numbers come from `draws` in turn (then `fallback`), so every wait is known: a wait of
 * {min, max} takes min + draw * (max - min). A draw of 0 waits the least: 3.2s for the next blink.
 */
function lifeWith(draws: number[], { emotion = 'awake' as Emotion, fallback = 0.99 } = {}) {
  const queue = [...draws];

  return createMascotLife({ emotion, random: () => queue.shift() ?? fallback });
}

/** The face at each of `times`, frame by frame. */
function facesAt(life: ReturnType<typeof createMascotLife>, times: number[]) {
  return times.map((time) => life.frame(time).face);
}

describe('createMascotLife', () => {
  it('blinks 3.2 seconds in at the soonest, shutting in 140ms and opening in 200ms, eased both ways', () => {
    // The first frame plans the blink 3.2s ahead (draw 0); the blink is single (draw 0.99).
    const life = lifeWith([0, 0.99]);

    expect(life.frame(0).face).toEqual({ blink: 0, joy: 0 });
    expect(life.frame(3199).face.blink).toBe(0);
    const [start, halfShut, shut, halfOpen, open] = facesAt(life, [3200, 3270, 3340, 3440, 3540]);

    expect(start.blink).toBe(0);
    // Smoothstep: half the time is half the way, and the ends are slow.
    expect(halfShut.blink).toBeCloseTo(0.5);
    expect(shut.blink).toBeCloseTo(1);
    expect(halfOpen.blink).toBeCloseTo(0.5);
    expect(open.blink).toBe(0);
    expect(life.frame(3215).face.blink).toBeLessThan(15 / 140);
  });

  it('now and then blinks twice, 90ms apart', () => {
    // A double blink (draw 0.1 is under 0.3).
    const life = lifeWith([0, 0.1]);
    life.frame(0);

    const [firstShut, between, secondShut, done] = facesAt(life, [3340, 3600, 3200 + 430 + 140, 3200 + 770 + 1]);

    expect(firstShut.blink).toBeCloseTo(1);
    expect(between.blink).toBe(0);
    expect(secondShut.blink).toBeCloseTo(1);
    expect(done.blink).toBe(0);
  });

  it('waits 3.2 to 7 seconds between blinks', () => {
    // The first blink after 3.2s (draw 0), single (0.99); the next one 7s after it ends (1), single (0.99).
    const life = lifeWith([0, 0.99, 1, 0.99]);
    const starts: number[] = [];
    let shut = false;

    for (let time = 0; time <= 12000; time += 10) {
      const closing = life.frame(time).face.blink > 0;
      if (closing && !shut) {
        starts.push(time);
      }
      shut = closing;
    }

    expect(starts).toEqual([3210, 3540 + 7000 + 10]);
  });

  it('thinks with the very face it has awake', () => {
    const awake = lifeWith([0, 0.99]);
    const thinking = lifeWith([0, 0.99], { emotion: 'thinking' });
    const times = [0, 1000, 3200, 3270, 3340, 3500, 6000];

    expect(facesAt(thinking, times)).toEqual(facesAt(awake, times));
  });

  it('turns its eyes happy in 420ms, eased, and never blinks while it smiles', () => {
    // No blink for a long while (draws near 1), and a long first smile.
    const life = lifeWith([0.99, 0.99]);
    life.frame(0);
    life.feel('happy', 0);

    const [start, halfway, smiling] = facesAt(life, [0, 210, 420]);
    expect(start.joy).toBe(0);
    expect(halfway.joy).toBeCloseTo(0.5);
    expect(smiling).toEqual({ blink: 0, joy: 1 });
    for (const time of [1000, 2000, 2900]) {
      expect(life.frame(time).face).toEqual({ blink: 0, joy: 1 });
    }
  });

  it('beams on and off while happy: smiles for 1.6 to 3s, looks ahead for 4 to 9s, and smiles again', () => {
    // First draw: the first blink's plan. Then a 1.6s smile (0), 4s with open eyes (0), and a smile again.
    const life = lifeWith([0.99, 0, 0, 0.99]);
    life.frame(0);
    life.feel('happy', 0);

    expect(life.frame(1599).face.joy).toBe(1);
    life.frame(1600);
    expect(life.frame(1600 + 420).face.joy).toBe(0);
    expect(life.frame(5599).face.joy).toBe(0);
    life.frame(5600);
    expect(life.frame(5600 + 420).face.joy).toBe(1);
  });

  it('lets a blink under way finish before it smiles, so no face ever jumps', () => {
    const life = lifeWith([0, 0.99, 0.99]);
    life.frame(0);
    life.frame(3200);
    life.frame(3300);
    life.feel('happy', 3300);

    // Still blinking at 3400: no smile yet.
    expect(life.frame(3400).face.joy).toBe(0);
    expect(life.frame(3540).face).toEqual({ blink: 0, joy: 0 });
    expect(life.frame(3540 + 210).face.joy).toBeCloseTo(0.5);
  });

  it('closes its eyes softly in 520ms when it falls asleep, and then nothing moves', () => {
    const life = lifeWith([0.99]);
    life.frame(0);
    life.feel('asleep', 100);

    expect(life.frame(100).face.blink).toBe(0);
    expect(life.frame(360).face.blink).toBeCloseTo(0.5);
    const asleep = life.frame(620);
    expect(asleep.face).toEqual({ blink: 1, joy: 0 });
    expect(asleep.still).toBe(true);
    for (const time of [5000, 20000, 60000]) {
      expect(life.frame(time)).toMatchObject({ face: { blink: 1, joy: 0 }, still: true });
    }
  });

  it('stops smiling before its eyes close, when it falls asleep while happy', () => {
    const life = lifeWith([0.99, 0.99]);
    life.frame(0);
    life.feel('happy', 0);
    life.frame(420);
    life.feel('asleep', 420);

    const turningBack = life.frame(630).face;
    expect(turningBack.blink).toBe(0);
    expect(turningBack.joy).toBeCloseTo(0.5);
    expect(life.frame(840).face).toEqual({ blink: 0, joy: 0 });
    expect(life.frame(840 + 520).face).toEqual({ blink: 1, joy: 0 });
  });

  it('settles on the still face of the emotion it ends on, and says when it is there', () => {
    const happy = lifeWith([0.99, 0]);
    happy.frame(0);
    happy.settle('happy', 0);
    expect(happy.frame(200).settled).toBe(false);
    expect(happy.frame(420)).toMatchObject({ face: restingFace('happy'), settled: true });
    // It keeps smiling: no turn back to open eyes, however long it waits.
    expect(happy.frame(60000)).toMatchObject({ face: restingFace('happy'), settled: true });

    const asleep = lifeWith([0.99]);
    asleep.frame(0);
    asleep.settle('asleep', 0);
    expect(asleep.frame(520)).toMatchObject({ face: restingFace('asleep'), settled: true });

    const awake = lifeWith([0]);
    awake.frame(0);
    awake.settle('awake', 0);
    // No blink starts once it settles.
    expect(awake.frame(5000)).toMatchObject({ face: restingFace('awake'), settled: true });
  });

  it('is moved by time, not by frames: one late frame lands where many would', () => {
    const smooth = lifeWith([0.99, 0.99]);
    const slow = lifeWith([0.99, 0.99]);
    for (const life of [smooth, slow]) {
      life.frame(0);
      life.feel('happy', 0);
    }

    for (let time = 0; time <= 300; time += 33) {
      smooth.frame(time);
    }

    expect(slow.frame(300).face.joy).toBeCloseTo(smooth.frame(300).face.joy);
  });
});

describe('restingFace', () => {
  it('has open eyes awake and thinking, the arcs happy, and shut eyes asleep', () => {
    expect(restingFace('awake')).toEqual({ blink: 0, joy: 0 });
    expect(restingFace('thinking')).toEqual({ blink: 0, joy: 0 });
    expect(restingFace('happy')).toEqual({ blink: 0, joy: 1 });
    expect(restingFace('asleep')).toEqual({ blink: 1, joy: 0 });
  });
});
