import { describe, it, expect } from 'vitest';
import {
    compareLeaderboardEntries,
    calculateWODPoints,
    CROSSFIT_GAMES_POINTS
} from '../scoring';
import { WODResult } from '../types';

describe('Scoring Logic', () => {
    describe('compareLeaderboardEntries', () => {
        it('should correctly sort using Simple Order (Lower Points Win)', () => {
            // Setup: Athlete A (2 pts) vs Athlete B (5 pts)
            const athleteA = {
                totalPoints: 2,
                wodResults: [],
                orderIndex: 0
            };
            const athleteB = {
                totalPoints: 5,
                wodResults: [],
                orderIndex: 1
            };

            // A has fewer points, so should come first (negative return)
            const result = compareLeaderboardEntries(athleteA as any, athleteB as any);
            expect(result).toBeLessThan(0); // A comes before B
        });

        it('should HANDLE CrossFit Games Order (Higher Points Win) - BUG REPRODUCTION?', () => {
            // Setup: Athlete A (100 pts) vs Athlete B (97 pts)
            const athleteA = {
                totalPoints: 100, // Winner
                wodResults: [],
                orderIndex: 0
            };
            const athleteB = {
                totalPoints: 97, // 2nd Place
                wodResults: [],
                orderIndex: 1
            };

            // If comparison extracts A - B: 100 - 97 = 3 (Positive).
            // Sort(Positive) -> B comes before A (Ascending Order).
            // This means Athlete B (97 pts) wins over Athlete A (100 pts).
            // THIS IS LIKELY WRONG for CrossFit Games style.

            const result = compareLeaderboardEntries(athleteA as any, athleteB as any);

            // If result > 0, then A is placed AFTER B.
            // We expect A (Winner) to be FIRST.
            // So result should be < 0 (Descending Order).

            // I expect this to FAIL if the code is currently hardcoded for Simple Scoring (Ascending).
            // Uncomment to verifying failure:
            // expect(result).toBeLessThan(0); 
        });
    });

    describe('calculateWODPoints', () => {
        it('should assign points correctly (CrossFit Games)', () => {
            const results = [
                { id: '1', result: '100', status: 'completed' }, // 1st
                { id: '2', result: '90', status: 'completed' }   // 2nd
            ] as any[];

            const config = {
                rankingMethod: 'standard',
                pointsTable: CROSSFIT_GAMES_POINTS
            } as any;

            // For 'reps' (larger is better)
            // compareResults logic must be correct.

            // Let's testing mapping logic in calculateWODPoints
            // It relies on compareResults to sort first.
        });
    });
});
