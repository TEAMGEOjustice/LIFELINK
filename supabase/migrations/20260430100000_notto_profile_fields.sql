ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS id_proof_type TEXT,
  ADD COLUMN IF NOT EXISTS id_proof_value TEXT,
  ADD COLUMN IF NOT EXISTS notto_registration_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notto_self_confirmed_testing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notto_self_confirmed_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_proof_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_proof_type_check
  CHECK (
    id_proof_type IS NULL
    OR id_proof_type IN ('aadhaar', 'passport', 'driving_license', 'voter_id', 'other')
  );
