import { describe, it, expect } from 'vitest';
import {
    generateHeats
} from '../heats';
// import { compareLeaderboardEntries } from '../scoring'; // Already tested in separate file if needed, but I'll re-include for completion
import { compareLeaderboardEntries } from '../scoring';

describe('Scoring Logic via compareLeaderboardEntries', () => {
    it('should correctly sort using Simple Order (Low Points = Win) - ASC', () => {
        // Setup: Athlete A (2 pts - Winner) vs Athlete B (5 pts - Loser)
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

        // ASC: a - b = 2 - 5 = -3. A comes first.
        const result = compareLeaderboardEntries(athleteA as any, athleteB as any, 'asc');
        expect(result).toBeLessThan(0);
    });

    it('should correctly sort using CrossFit Order (High Points = Win) - DESC', () => {
        // Setup: Athlete A (100 pts - Winner) vs Athlete B (97 pts - Loser)
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

        // DESC: b - a = 97 - 100 = -3. A comes first.
        const result = compareLeaderboardEntries(athleteA as any, athleteB as any, 'desc');

        expect(result).toBeLessThan(0);
    });
});

describe('Heats Logic', () => {
    // Top to Bottom: B (100), E (90), C (50), D (40), A (10)
    // Best Athletes: B, E
    // Worst Athletes: A, D
    const mockLeaderboard: any[] = [
        { participantId: 'A', participantName: 'Athlete A', totalPoints: 10, position: 5 },
        { participantId: 'B', participantName: 'Athlete B', totalPoints: 100, position: 1 },
        { participantId: 'C', participantName: 'Athlete C', totalPoints: 50, position: 3 },
        { participantId: 'D', participantName: 'Athlete D', totalPoints: 40, position: 4 },
        { participantId: 'E', participantName: 'Athlete E', totalPoints: 90, position: 2 },
    ];

    it('should place BEST athletes in LAST heat (CrossFit Style - High Points)', () => {
        // High Points = Best.
        // Heats usually order: Worst -> Best.
        // Expected Order: A(10), D(40), C(50) -> Heat 1
        //                 E(90), B(100) -> Heat 2

        const heats = generateHeats(
            mockLeaderboard,
            3, // 3 per heat
            'cat1',
            'wod1',
            new Map()
        );

        // Check Heat 1 (First 3)
        // generateHeats sorts by a.totalPoints - b.totalPoints (Ascending)
        // So: 10, 40, 50, 90, 100.
        // Heat 1: 10, 40, 50. (A, D, C) - The "Worst"
        // Heat 2: 90, 100. (E, B) - The "Best"

        expect(heats.length).toBe(2);

        const heat1 = heats.find(h => h.heatNumber === 1);
        const heat2 = heats.find(h => h.heatNumber === 2);

        expect(heat1?.participants.map(p => p.totalPoints)).toEqual([10, 40, 50]);
        expect(heat2?.participants.map(p => p.totalPoints)).toEqual([90, 100]);

        // This confirms standard logic works for CrossFit Style
    });

    it('should place BEST athletes in FIRST heat (Simple Order - Low Points) - exposes ISSUE', () => {
        // Simple Order: 1 pt = Best. 100 pts = Worst.
        // Current Logic: Sorts by Points Ascending.
        // Order: 1, 2, 5...
        // Heat 1: 1, 2, 5... (The Best!)
        // Heat 2: 100... (The Worst!)
        // This is technically "seeded", but usually main event wants Best in Last Heat.

        const simpleLeaderboard = [
            { participantId: 'Winner', totalPoints: 1 },
            { participantId: 'Second', totalPoints: 2 },
            { participantId: 'Loser', totalPoints: 100 }
        ] as any[];

        const heats = generateHeats(
            simpleLeaderboard,
            2,
            'cat1',
            'wod1',
            new Map()
        );

        const heat1 = heats.find(h => h.heatNumber === 1);
        // Heat 1 gets [1, 2] -> The Winners.
        expect(heat1?.participants.map(p => p.totalPoints)).toEqual([1, 2]);

        // If we want Winner in Last Heat, we would expect Heat 1 to have [100]?
        // Wait, 3 people, 2 per heat.
        // Heat 1: 1 person? Heat 2: 2 people? 
        // Logic: ceil(3/2) = 2 heats.
        // Heat 1: Index 0, 1. (Winner, Second).
        // Heat 2: Index 2. (Loser).

        // Verification: The code puts Winners in Heat 1 for Simple Scoring.
    });
});
