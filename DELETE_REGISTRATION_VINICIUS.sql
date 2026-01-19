-- Remove pending registrations for the specified email to allow re-registration and payment testing
-- Filters by 'pending' payment status to ensure we don't accidentally delete completed ones (though user implies they only have this one blocking one)

DELETE FROM registrations
WHERE athlete_email = 'vinicius.almeidaa93@gmail.com'
AND payment_status = 'pending';

-- Verify deletion (optional, checking what remains)
SELECT * FROM registrations WHERE athlete_email = 'vinicius.almeidaa93@gmail.com';
