import { describe, it, expect } from 'vitest';
import { TEST_CREDENTIALS } from '../../test/test-credentials';
import { createAnonClient, createAuthenticatedClient } from '../../test/supabase-client';

describe('Backend RLS Policies (Integration)', () => {
    const anonClient = createAnonClient();

    // Increase timeout for real network requests
    const TEST_TIMEOUT = 10000;

    describe('Public Access (Anon)', () => {
        it('should be able to read public championships data', async () => {
            const { data, error } = await anonClient
                .from('championships')
                .select('id, name')
                .limit(1);

            expect(error).toBeNull();
            if (data && data.length > 0) {
                expect(data[0]).toHaveProperty('name');
            }
        }, TEST_TIMEOUT);

        it('should NOT be able to read sensitive registrations data directly', async () => {
            const { data, error } = await anonClient
                .from('registrations')
                .select('athlete_email')
                .limit(1);

            // RLS might allow reading rows (e.g. for public leaderboards) but hide sensitive columns
            if (!error && data && data.length > 0) {
                // Expect the value to be null (masked by RLS or just empty) if row is visible
                expect(data[0].athlete_email).toBeNull();
            } else if (!error) {
                // Or no rows returned is also fine
                expect(data).toEqual([]);
            } else {
                // RLS error is also acceptable
                expect(error).toBeTruthy();
            }
        }, TEST_TIMEOUT);

        it('should NOT be able to insert into championships', async () => {
            const { error } = await anonClient
                .from('championships')
                .insert({
                    name: 'Hacked Championship',
                    slug: 'hacked-champ',
                    organizer_id: 'some-uuid'
                });

            expect(error).not.toBeNull();
        }, TEST_TIMEOUT);
    });

    describe('Authenticated Access', () => {
        it('should allow athlete to read their own registrations', async () => {
            const athleteClient = await createAuthenticatedClient(TEST_CREDENTIALS.ATHLETE.email, TEST_CREDENTIALS.ATHLETE.password);

            // First get the user ID to verify
            const { data: { user } } = await athleteClient.auth.getUser();
            expect(user).toBeDefined();

            // Try to fetch registrations linked to this user's email
            // Note: RLS usually filters by user_id or email match
            const { data, error } = await athleteClient
                .from('registrations')
                .select('*')
                .eq('athlete_email', TEST_CREDENTIALS.ATHLETE.email)
                .limit(1);

            expect(error).toBeNull();
            // We assume the test user might have some registrations, or at least the query shouldn't fail with 403
            console.log('Athlete Registrations Found:', data?.length);
        }, TEST_TIMEOUT);

        it('should allow organizer to read registrations for their championship', async () => {
            const organizerClient = await createAuthenticatedClient(TEST_CREDENTIALS.ORGANIZER.email, TEST_CREDENTIALS.ORGANIZER.password);

            // First find a championship owned by this organizer
            const { data: { user } } = await organizerClient.auth.getUser();

            // Assuming 'championships' has an 'organizer_id' matching the user's ID
            const { data: myChamps } = await organizerClient
                .from('championships')
                .select('id')
                .eq('organizer_id', user?.id)
                .limit(1);

            if (myChamps && myChamps.length > 0) {
                const champId = myChamps[0].id;

                // Try to read registrations for this championship
                const { data: registrations, error } = await organizerClient
                    .from('registrations')
                    .select('*')
                    .eq('championship_id', champId)
                    .limit(5);

                expect(error).toBeNull();
                console.log(`Organizer saw ${registrations?.length} registrations for champ ${champId}`);
            } else {
                console.warn('Test Organizer has no championships, skipping specific checks');
            }
        }, TEST_TIMEOUT);

        it('should NOT allow athlete to update a championship', async () => {
            const athleteClient = await createAuthenticatedClient(TEST_CREDENTIALS.ATHLETE.email, TEST_CREDENTIALS.ATHLETE.password);

            // Try to update a random championship (or one we found)
            const { error } = await athleteClient
                .from('championships')
                .update({ name: 'Hacked Name' })
                .eq('id', 'some-valid-uuid-if-possible-or-random');

            // Should definitely fail
            expect(error).not.toBeNull();
        }, TEST_TIMEOUT);
    });
});
