import type { GameRecord } from '../types';

type HandicapRecord = Pick<GameRecord, 'type' | 'win' | 'highRun'>;

const handicapSteps = [50, 80, 100, 120, 150, 180, 200, 250, 300, 400, 500, 700, 1000];

const nearestHandicapStep = (value: number) => (
  handicapSteps.reduce((nearest, candidate) => (
    Math.abs(candidate - value) < Math.abs(nearest - value) ? candidate : nearest
  ))
);

export const calculateAutomaticHandicaps = (
  records: HandicapRecord[],
  targetCushionCount: number,
) => {
  const threeCushionRecords = records.filter((record) => record.type === '3-Cushion');
  const fourBallRecords = records.filter((record) => record.type === '4-Ball');

  const threeCushionWinRate = calculateWinRate(threeCushionRecords);
  const threeCushionAverageHighRun = calculateAverageHighRun(threeCushionRecords, 3);
  const fourBallWinRate = calculateWinRate(fourBallRecords);
  const fourBallAverageHighRun = calculateAverageHighRun(fourBallRecords, 6);

  let threeBallHandicap = threeCushionAverageHighRun >= 7 ? 300
    : threeCushionAverageHighRun >= 5 ? 250
      : threeCushionAverageHighRun >= 4 ? 200
        : threeCushionAverageHighRun >= 3 ? 180
          : threeCushionAverageHighRun >= 2 ? 120
            : 100;

  if (threeCushionWinRate > 60) threeBallHandicap = nearestHandicapStep(threeBallHandicap + 20);
  else if (threeCushionWinRate > 55) threeBallHandicap = nearestHandicapStep(threeBallHandicap + 10);
  else if (threeCushionWinRate < 40) threeBallHandicap = nearestHandicapStep(threeBallHandicap - 20);

  let fourBallHandicap = fourBallAverageHighRun >= 15 ? 400
    : fourBallAverageHighRun >= 10 ? 300
      : fourBallAverageHighRun >= 8 ? 250
        : fourBallAverageHighRun >= 6 ? 200
          : fourBallAverageHighRun >= 4 ? 150
            : 100;

  if (targetCushionCount === 0) fourBallHandicap += 55;
  else if (targetCushionCount === 2) fourBallHandicap -= 50;

  if (fourBallWinRate > 60) fourBallHandicap = nearestHandicapStep(fourBallHandicap + 50);
  else if (fourBallWinRate > 55) fourBallHandicap = nearestHandicapStep(fourBallHandicap + 30);
  else if (fourBallWinRate < 40) fourBallHandicap = nearestHandicapStep(fourBallHandicap - 30);

  return {
    threeBallHandicap: clampHandicap(threeBallHandicap),
    fourBallHandicap: clampHandicap(fourBallHandicap),
  };
};

const calculateWinRate = (records: HandicapRecord[]) => {
  if (records.length === 0) return 50;
  return records.filter((record) => record.win).length / records.length * 100;
};

const calculateAverageHighRun = (records: HandicapRecord[], fallback: number) => {
  if (records.length === 0) return fallback;
  return records.reduce((sum, record) => sum + (record.highRun || 0), 0) / records.length;
};

const clampHandicap = (value: number) => Math.max(50, Math.min(1000, value));
